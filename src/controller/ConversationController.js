// ConversationController.js

import Conversation from "#src/model/Conversation";
import { fail, success } from "#src/helper/res";
// 引入 Sequelize 的 Op (操作符)，用于实现条件查询（如小于 <）
import { Op } from 'sequelize';
import ConversationDto from "#src/dao/ConversationDao";

class ConversationController {

    /**
     * @route GET /conversations
     * @description 获取当前用户的会话列表，支持倒序分页。
     * @queryParam {number} lastId 上一页最小的会话ID（用于分页/加载更多）
     */
    async getList(req, res) {
        // 1. 获取用户ID
        const user_id = req.session.user_id;
        // 2. 设置查询参数

        const { last_id } = req.query; // 获取请求参数中的最小ID

        try {
            //todo 改为安上次使用时间来排！
            const list = await ConversationDto.getList({
                user_id,
                last_id: parseInt(last_id),
            });

            // 5. 返回结果
            res.json(success(list));

        } catch (error) {
            console.error('获取会话列表失败:', error);
            // 假设您有一个返回服务器错误的 helper
            res.status(500).json(fail(error));
        }
    }

    /**
     * @route POST /conversation/delete
     * @description 删除指定会话
     * @bodyParam {number} conversation_id 会话ID
     */
    async delete(req, res) {
        const user_id = req.session.user_id;
        const { conversation_id } = req.body;

        if (!conversation_id) {
            return res.json(fail('Conversation ID is required.'));
        }

        try {
            const result = await ConversationDto.delete(conversation_id, user_id);
            if (result) {
                res.json(success(null, 'Conversation deleted.'));
            } else {
                res.json(fail('Conversation not found or not authorized.'));
            }
        } catch (error) {
            console.error('删除会话失败:', error);
            res.json(fail('Internal server error.'));
        }
    }
}

export default new ConversationController;