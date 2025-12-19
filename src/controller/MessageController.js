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
        // 1. 立即创建控制器并监听断开
        const abortController = new AbortController();

        // 监听 res 的 close 事件比 req 更可靠
        res.on('close', () => {
            if (!abortController.signal.aborted) {
                console.log('--- 🚀 客户端已断开，立即中止 AI 任务 ---');
                abortController.abort();
            }
        });
        try {
            const user_id = req.session.user_id;
            const { content, conversation_id } = req.body;

            if (!content) return res.json(fail('消息为空'));

            // 2. 尽早发出响应头
            res.writeHead(200, {
                 'Content-Type': 'application/json',
                 'Transfer-Encoding': 'chunked',


                // 'Content-Type': 'text/event-stream',
                // 'Cache-Control': 'no-cache',
                // 'Connection': 'keep-alive',
                // 'X-Accel-Buffering': 'no' // 禁用 Nginx 缓存，关键！
            });

            const sendChunk = (textChunk,conversationId) => {
                if (res.writableEnded) {
                    return;
                }
                if (textChunk)
                {
                    // 标准 SSE 格式
                    res.write(JSON.stringify({ type: 'stream', content: textChunk,conversationId : conversationId }));
                }
            };

            const messageService = new MessageService({ user_id, content, conversation_id });

            // 3. 执行 AI 发送逻辑
            const result = await messageService.send(abortController, sendChunk);

            // 4. 发送结束标记
            if (!res.writableEnded) {
                res.write(`${JSON.stringify({
                    type: 'end',
                    conversationId: result.conversation_id,
                    messageId: result.message_id
                })}`);
                res.end();
            }

            // const msgCount = await MessageDto.countByConversationId(result.conversation_id);
            // if (msgCount <= 2) {
            //     messageService.generateTitle().catch(err => {
            //         console.error("Auto-Title generation failed:", err);
            //     });
            //
            // }

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