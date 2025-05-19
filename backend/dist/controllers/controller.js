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
const headPopulateData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    try {
        const chatbot = yield ChatBot_1.ChatBot.create(chat_bot_session_id, true);
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
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    try {
        const chatBot = yield ChatBot_1.ChatBot.create(chat_bot_session_id, true);
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
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    const { message } = req.body;
    try {
        const chatbot = yield ChatBot_1.ChatBot.create(chat_bot_session_id, true);
        const response = yield chatbot.sendMessage(message);
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
