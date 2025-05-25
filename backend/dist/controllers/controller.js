"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.getSessionMessages = exports.headPopulateData = void 0;
const ChatBot_1 = require("../models/ChatBot");
const sessionCache = new Map();
function getOrCreateChatBot(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!sessionCache.has(sessionId)) {
            const bot = yield ChatBot_1.ChatBot.create(sessionId, true);
            sessionCache.set(sessionId, bot);
        }
        return sessionCache.get(sessionId);
    });
}
const headPopulateData = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chatbot = yield getOrCreateChatBot("temporaryStringForUptimeRobot");
        yield chatbot.getVSManager().refreshInformationInVectorStore();
        res.status(200).json(null);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(null);
    }
});
exports.headPopulateData = headPopulateData;
const getSessionMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chat_bot_session_id = req.chat_bot_session_id;
    try {
        console.log(chat_bot_session_id);
        const chatBot = yield getOrCreateChatBot(chat_bot_session_id);
        const history = yield chatBot.getChatHistory();
        res.status(200).json(history);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err,
        });
    }
});
exports.getSessionMessages = getSessionMessages;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chat_bot_session_id = req.chat_bot_session_id;
    const { message } = req.body;
    try {
        console.log(chat_bot_session_id);
        const chatBot = yield getOrCreateChatBot(chat_bot_session_id);
        const response = yield chatBot.sendMessage(message);
        res.status(200).json({
            type: "ai",
            content: response,
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err,
        });
    }
});
exports.sendMessage = sendMessage;
