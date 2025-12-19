// src/routes/index.js

import express from 'express';
// 导入 MessageController 的实例 (注意这里的路径别名 #src/controller/...)
import MessageController from '#src/controller/MessageController';
import ConversationController from "#src/controller/ConversationController";
import TestController from "#src/controller/TestController";

const router = express.Router();


// 参数 ：content:用户发的内容，conversation_id:会话id
// sse 结果的
// sse 结果的
router.post('/message/send', (req, res) => MessageController.send(req, res));


// 参数：conversation_id:会话id
//{code : 1,msg : 'ok',data:[{id，role,conten}]}
router.get('/message/history', (req, res) => MessageController.getList(req, res));


//参数 last_id :上一页最后一条Id
//{code : 1,msg : 'ok',data:[{id，title}]}
//参数 last_id :上一页最后一条Id
//{code : 1,msg : 'ok',data:[{id，title}]}
router.get('/conversation/history', (req, res) => ConversationController.getList(req, res));


router.post('/conversation/delete', (req, res) => ConversationController.delete(req, res));


export default router;