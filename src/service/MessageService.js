import ConversationService from "#src/service/ConversationService";
import MessageDto from "#src/dao/MessageDao";
import config from "#src/config/lm-studio-server"
import ConversationDto from "#src/dao/ConversationDao";
import {Chat} from "@lmstudio/sdk";
import {getModel} from "#src/lib/ai-client";


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


    async send(abortController,sendChunk)
    {

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

        const chat = Chat.from(messagesForAI);


        const aiModel = await getModel();


        const prediction = aiModel.respond(chat,{
            signal: abortController.signal,
        });

        const aiMessageData = {
            role: 'assistant',
            content: '',
            conversation_id: this.#conversation_id,
        };
        const aiMessage = await MessageDto.createOne(aiMessageData);
        for await (const item of prediction)
        {


            if (item.reasoningType === 'reasoningStartTag') {
                this.#fullAiResponseContent += '<think>'
                sendChunk('<think>',this.#conversation_id);
            }
            this.#fullAiResponseContent += item.content;
            if (item.reasoningType === 'reasoningEndTag') {
                this.#fullAiResponseContent += '</think>'
                sendChunk('</think>',this.#conversation_id);
            }

            sendChunk(item.content,this.#conversation_id);

            //process.stdout.write(item.content);
            await MessageDto.updateContent(aiMessage.id, this.#fullAiResponseContent);
        }
        await MessageDto.updateContent(aiMessage.id, this.#fullAiResponseContent);
        return {
            conversation_id : this.#conversation_id,
            message_id : aiMessage.id,
        };
    }



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
