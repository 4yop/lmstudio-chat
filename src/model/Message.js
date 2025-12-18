import db from "../lib/db.js"
import { DataTypes } from 'sequelize';

const sequelize = db.sequelize;

/**
 * ## 2. Message (消息记录) 模型定义
 * 存储对话中的每一条消息。
 */
const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '消息ID'
    },
    role: {
        type: DataTypes.STRING, // 例如: 'user', 'assistant', 'system'
        allowNull: false,
        comment: '消息角色'
    },
    content: {
        type: DataTypes.STRING, // 使用 TEXT 类型存储长文本
        allowNull: false,
        comment: '消息内容'
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        comment: '会话Id'
    },
}, {
    tableName: 'messages',
    comment: '消息记录表',
    indexes: [
        {
            name: 'conversation_id_index', // 索引名称
            fields: ['conversation_id']    // 需要索引的字段
        }
    ]
});



export default Message