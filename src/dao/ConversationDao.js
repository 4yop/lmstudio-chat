import Conversation from "#src/model/Conversation";
import { Op } from "sequelize";

class ConversationDao {
    async getById(id) {
        return await Conversation.findOne({
            where: { id: id }
        });
    }

    async createOne({ user_id, title = '新对话' }) {
        return await Conversation.create({
            user_id: user_id,
            title: title,
        })
    }

    async getList({ user_id, last_id = 0, limit = 100 }) {
        let where = {
            user_id: user_id,
        };
        if (last_id > 0) {
            where.id = {
                [Op.lt]: last_id
            };
        }

        const list = await Conversation.findAll({
            where: where,
            order: [
                // 倒序：按 ID 从大到小排列 (最新的在前面)
                ['id', 'DESC']
            ],
            limit: limit, // 限制查询数量
        });
        return list;
    }

    async delete(id, user_id) {
        return await Conversation.destroy({
            where: {
                id: id,
                user_id: user_id // Double check ownership
            }
        });
    }

    async updateTitle(id, title) {
        return await Conversation.update({ title }, {
            where: { id: id }
        })
    }
}


export default new ConversationDao()