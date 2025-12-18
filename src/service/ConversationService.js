import ConversationDto from "#src/dao/ConversationDao";
import {fail} from "#src/helper/res";

class ConversationService
{

    async createOrFindUserConversation({user_id,title = '新对话',conversation_id = 0 })
    {
        if (conversation_id)
        {
            const conversation = await ConversationDto.getById(conversation_id);
            if (!conversation || conversation.user_id !== user_id)
            {
                throw new Error('Invalid conversation ID.')
            }
            return conversation;
        }
            // 没有会话ID，创建新会话
        return await ConversationDto.createOne({
            user_id,
            title: title
        });
    }

}

export default new ConversationService()