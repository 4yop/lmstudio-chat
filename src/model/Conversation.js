import db from "../lib/db.js"
import { DataTypes } from 'sequelize';

const sequelize = db.sequelize;

/**
 * ## 1. Conversation (对话记录) 模型定义
 * 存储用户发起的一组对话的元数据。
 */
const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '对话ID'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '新对话',
        comment: '对话标题（通常是第一条消息的摘要）'
    },
    // 可选：关联的用户ID，如果您有用户表
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '所属用户ID'
    }
}, {
    tableName: 'conversations',
    comment: '对话记录表'
});






export default Conversation

