// MessageController.js

import ConversationDto from "#src/dao/ConversationDao";
import MessageDto from "#src/dao/MessageDao";
import { success, fail } from "#src/helper/res";
import ConversationService from "#src/service/ConversationService";
import MessageService from "#src/service/MessageService";


class MessageController {


    async getList(req, res) {
        let { conversation_id, limit, before_id } = req.query;
        // 确保用户已登录
        const user_id = req.session.user_id;

        limit = parseInt(limit) || 20;

        const conversation = await ConversationDto.getById(conversation_id);

        // 权限校验：确保会话存在且属于当前用户
        if (!conversation || conversation.user_id !== user_id) {
            return res.json(fail('Invalid conversation ID.'));
        }

        const list = await MessageDto.getListByConversationId(conversation_id, limit, before_id);
        res.json(success(list));
    }


    /**
     * @route POST /message/send
     * @description 处理用户发送的消息，创建会话（如果需要），保存消息，并获取AI回复。
     * @bodyParam {string} content - 用户消息内容
     * @bodyParam {number} [conversation_id] - 可选的会话ID
     */
    async send(req, res) {
        try {
            // 确保用户已登录 (假设 req.session.user_id 已被中间件强制设置为 1)
            const user_id = req.session.user_id;

            // 假设数据来自 req.body (通常是 POST 请求的标准做法)
            const { content, conversation_id: conversation_id } = req.body;

            if (!content) {
                return res.json(fail('消息为空'));
            }

            // 创建 AbortController 用于控制上游 AI 请求
            const abortController = new AbortController();

            // 监听客户端连接断开事件 (req 'close')
            // 当用户点击停止或关闭页面时触发
            req.on('close', () => {
                if (!res.writableEnded) {
                    console.log('Client closed connection. Aborting AI request...');
                    abortController.abort();
                }
            });


            const messageService = new MessageService({
                user_id,content,conversation_id:conversation_id
            });
            await messageService.send(abortController);
            res.writeHead(200, {
                'Content-Type': 'application/json', // 或者使用 'text/event-stream' (SSE)
                'Transfer-Encoding': 'chunked',
            });

            const sendChunk = (textChunk) => {
                if (textChunk) {
                    try {
                        // 增加 try-catch 即使客户端断开链接，也不影响后端继续接收流并保存
                        if (!res.writableEnded) {
                            res.write(JSON.stringify({ type: 'stream', content: textChunk }));
                        }
                    } catch (e) {
                        // 客户端断开，忽略错误
                    }

                }
            };

            const result = await messageService.receive(sendChunk)

            try {
                if (!res.writableEnded) {
                    res.write(JSON.stringify({
                        type: 'end',
                        conversationId: result.conversation_id,
                        messageId: result.message_id
                    }));
                    res.end();
                }
            } catch (e) {
                // ignore
            }

            const msgCount = await MessageDto.countByConversationId(result.conversation_id);
            if (msgCount <= 2) {
                messageService.generateTitle().catch(err => {
                    console.error("Auto-Title generation failed:", err);
                });

            }

        } catch (error) {
            // 如果是 abort 导致的 fetch error，可以忽略或记录
            if (error.name === 'AbortError') {
                console.log('Fetch aborted by user action.');
                return; // 结束函数
            }

            console.error('AI或数据库操作失败:', error);

            // 如果响应头没有发出，可以发送 500 错误
            if (!res.headersSent) {
                return res.status(500).json(fail( 'AI interaction or database error.'));
            }
            // 如果流已经开始，发送一个错误标记并关闭流
            if (!res.writableEnded) {
                res.write(JSON.stringify({ type: 'error', message: 'An internal error occurred during streaming.' }));
                res.end();
            }
        }
    }

}

export default new MessageController;