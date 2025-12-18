import Message from "#src/model/Message";
import { Op } from "sequelize";

class MessageDao {
    async createOne({ role, content, conversation_id }) {
        return await Message.create({
            role,
            content,
            conversation_id,
        })
    }

    async getListByConversationId(conversation_id, limit = 20, beforeId = null) {
        const where = {
            conversation_id: conversation_id,
        };

        if (beforeId) {
            where.id = {
                [Op.lt]: beforeId
            };
        }

        const list = await Message.findAll({
            where: where,
            limit: limit,
            order: [
                ['id', 'DESC']
            ]
        });

        // 此时 list 是倒序的 (最新的在最前)，为了方便前端展示习惯，我们在返回前将其反转回正序 (旧 -> 新)
        return list.reverse();
    }

    async countByConversationId(conversation_id) {
        return await Message.count({
            where: { conversation_id }
        });
    }

    async updateContent(id, content) {
        return await Message.update({ content }, {
            where: { id }
        });
    }

}


export default new MessageDao()