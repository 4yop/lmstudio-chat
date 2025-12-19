import ConversationService from "#src/service/ConversationService";
import config from "#src/config/lm-studio-server";
import MessageDto from "#src/dao/MessageDao";



class ChatRepository
{
    /**
     * 初始化会话环境：确保会话存在，并保存用户消息，必要时初始化系统消息
     */
    async initializeConversationContext({ user_id, conversation_id, content, system_msg = config.system_msg })
    {
        //todo 用事务了，每个都得传 {transaction:t}  烦的一批
        const currentConversation = await ConversationService.createOrFindUserConversation({
            user_id: user_id,
            conversation_id: conversation_id,
            title: content.substring(0, 20) || '新对话',
        });

        if (conversation_id !== currentConversation.id) {
            const systemMessageData = {
                role: 'system',
                content: system_msg,
                conversation_id: conversation_id,
            };
            const systemMessage = await MessageDto.createOne(systemMessageData);
            if (!systemMessage) {
                throw new Error('Failed to save system message.');
            }
        }
        conversation_id = currentConversation.id

        // 2. 保存用户消息 (Role: user)
        const userMessageData = {
            role: 'user',
            content: content,
            conversation_id: conversation_id,
        };
        const userMessage = await MessageDto.createOne(userMessageData);
        if (!userMessage) {
            throw new Error('Failed to save user message.');
        }
        return {
            userMessage : userMessage,
            currentConversation : currentConversation,
        }
    }
}

export default new ChatRepository()