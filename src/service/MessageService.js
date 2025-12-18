import ConversationService from "#src/service/ConversationService";
import MessageDto from "#src/dao/MessageDao";
import config from "#src/config/lm-studio-server"
import ConversationDto from "#src/dao/ConversationDao";


export default class MessageService
{
    #user_id;
    #conversation_id = 0;
    #content;

    #currentConversation;//当前对话

    #aiResponse = null;

    #fullAiResponseContent = '';//用于累计AI的完整回复内容

    #isThinking = false;// 标记是否正在输出思考过程

    #abortController = null;

    constructor({user_id,conversation_id = 0,content})
    {
        this.#user_id = user_id;
        this.#conversation_id = conversation_id;
        this.#content = content;
    }


    async send(abortController)
    {
        this.#abortController = abortController;
        this.#currentConversation = await ConversationService.createOrFindUserConversation({
            user_id: this.#user_id,
            conversation_id: this.#conversation_id,
            title: this.#content.substring(0, 20) || '新对话',
        });

        this.#conversation_id = this.#currentConversation.id;

        // 2. 保存用户消息 (Role: user)
        const userMessageData = {
            role: 'user',
            content: this.#content,
            conversation_id: this.#conversation_id,
        };
        const userMessage = await MessageDto.createOne(userMessageData);
        if (!userMessage) {
            throw new Error('Failed to save user message.');
        }

        const historyMessages = await MessageDto.getListByConversationId(this.#conversation_id);

        // 4. 格式化消息为 LM Studio Client/OpenAI 格式
        const messagesForAI = historyMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        // 5. 调用 AI (Fetch API) 并进行流式响应
        this.#aiResponse = await fetch(config.api_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: config.model_id,
                messages: messagesForAI,
                stream: true,
                temperature: 0.7
            }),
            signal: this.#abortController.signal // 绑定 abort signal
        });

        if (!this.#aiResponse.ok) {
            throw new Error(`AI API failed with status ${this.#aiResponse.status}: ${await this.#aiResponse.text()}`);
        }
        return this.#aiResponse;
    }

    processLine (line)  {
        line = line.trim();
        if (!line.startsWith("data: ")) return null;
        const dataStr = line.substring(6).trim();
        if (dataStr === "[DONE]") return null;

        try {
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta || {};
            const content = delta.content || "";
            const reasoning = delta.reasoning_content || delta.reasoning || ""; // 兼容不同字段名
            return { content, reasoning };
        } catch (e) {
            console.warn("Error parsing JSON:", e);
            return null;
        }
    };

    async receive(callback)
    {
        console.log('receive');
        let callbacks = (textChunk)=> {
            callback(textChunk);
            if (textChunk) {
                console.log(textChunk)
                this.#fullAiResponseContent += textChunk;
            }
        };

        const aiMessageData = {
            role: 'assistant',
            content: '',
            conversation_id: this.#conversation_id,
        };
        const aiMessage = await MessageDto.createOne(aiMessageData);

        const stream = this.#aiResponse.body;
        if (!stream || !stream[Symbol.asyncIterator])
        {
            throw new Error("Stream is not iterable in this environment.");
        }
        let lastSavedLength = 0;
        const SAVE_INTERVAL_CHARS = 10; // 每收到一定字符就保存一次数据库
        const decoder = new TextDecoder("utf-8");

        let buffer = "";
        try {
            for await (const chunk of stream) {
                // 如果已经被 abort，退出循环
                if (this.#abortController.signal.aborted) break;

                const decodedChunk = decoder.decode(chunk, { stream: true });
                buffer += decodedChunk;

                const lines = buffer.split("\n");
                buffer = lines.pop(); // 保留最后如果不完整的行

                for (const line of lines) {
                    const result = this.processLine(line);
                    if (result) {
                        const { content, reasoning } = result;

                        // 思考标签逻辑
                        if (reasoning) {
                            if (!this.#isThinking) {
                                callbacks('<think>');
                                this.#isThinking = true;
                            }
                            callbacks(reasoning);
                        }

                        if (content) {
                            if (this.#isThinking) {
                                callbacks('</think>');
                                this.#isThinking = false;
                            }
                            callbacks(content);
                        }
                    }
                }

                // 增量保存逻辑：每隔一段长度更新一次数据库
                if (this.#fullAiResponseContent.length - lastSavedLength >= SAVE_INTERVAL_CHARS) {
                    await MessageDto.updateContent(aiMessage.id, this.#fullAiResponseContent);
                    lastSavedLength = this.#fullAiResponseContent.length;
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Upstream AI request aborted.');
            } else {
                throw err;
            }
        } // try catch
        if (!this.#isThinking) {
            callbacks('</think>');
        }
        await MessageDto.updateContent(aiMessage.id, this.#fullAiResponseContent);

        return {
            message_id : aiMessage.id,
            conversation_id : this.#conversation_id,
        }
    } //for stream


    async generateTitle() {
        console.log(`[Auto-Title] Starting for conversation ${this.#conversation_id}...`);

        // 构造 Prompt
        // 截取一部分内容防止过长
        const context = `User: ${this.#content.substring(0, 500)}\nAI: ${this.#fullAiResponseContent.substring(0, 500)}`;
        const prompt = `请为上面的对话生成一个简洁的中文标题（不超过10个字）。不要包含引号或其他标点。仅输出标题文字。\n\n${context}`;

        try {
            const response = await fetch(config.api_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: config.model_id,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    stream: false, // 标题生成不需要流式
                    max_tokens: 50,
                    temperature: 0.5
                })
            });

            if (!response.ok) throw new Error(`API status ${response.status}`);

            const data = await response.json();
            let newTitle = data.choices?.[0]?.message?.content?.trim() || "";

            // 清理可能包含的"标题："前缀或引号
            newTitle = newTitle.replace(/^标题[:：]/, '').replace(/["']/g, '').trim();

            if (newTitle) {
                // 更新数据库
                // 这里我们要引入 Conversation Model 或者 DTO 的 update 方法
                // 暂时直接使用 Conversation Model 的 update (需确保 import 了 Model 或者通过 DTO)
                // 最好在 ConversationDto 中添加 updateTitle 方法
                await ConversationDto.updateTitle(this.#conversation_id, newTitle);
                console.log(`[Auto-Title] Updated conversation ${this.#conversation_id} title to: ${newTitle}`);
            }

        } catch (e) {
            console.error(`[Auto-Title] Error:`, e);
        }
    }
}
