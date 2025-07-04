import { Request, Response } from "express";
import { ChatBot } from "../models/ChatBot";

const sessionCache = new Map<string, ChatBot>();

async function getOrCreateChatBot(sessionId: string): Promise<ChatBot> {
    if (!sessionCache.has(sessionId)) {
        const bot = await ChatBot.create(sessionId, true);
        sessionCache.set(sessionId, bot);
    }
    return sessionCache.get(sessionId)!;
}

const headUptimeRobot = (_:Request, res: Response) => {
    res.status(200).json({ message : "endpoint successfully contacted"});
}

const getSessionMessages = async (req : Request, res: Response) => {
    const chat_bot_session_id = req.chat_bot_session_id;
    try {
        console.log(chat_bot_session_id);
        const chatBot: ChatBot = await getOrCreateChatBot(chat_bot_session_id);
        const history = chatBot.getChatHistory();
        res.status(200).json(history);
    }
    catch(err) {
        console.log(err);
        res.status(500).json({
            error: err,
        });
    }
}

const sendMessage = async (req: Request, res: Response) => {
    const chat_bot_session_id = req.chat_bot_session_id;
    const { message } = req.body;
    try {
        console.log(chat_bot_session_id);
        const chatBot: ChatBot = await getOrCreateChatBot(chat_bot_session_id);
        const response = await chatBot.sendMessage(message as string);
        res.status(200).json({
            type: "ai",
            content: response,
        });
    }
    catch(err) {
        console.log(err);
        res.status(500).json({
            error: err,
        })
    }
}

const killBot = async (req: Request, res: Response) => {
    const chat_bot_session_id = req.chat_bot_session_id;
    try {
        console.log(chat_bot_session_id);
        sessionCache.delete(chat_bot_session_id);
        res.status(200).json({
            message: "Memory Successfully Wiped"
        })
    }
    catch(err) {
        console.log(err);
        res.status(500).json({
            error: err,
        })
    }
}

export { headUptimeRobot, getSessionMessages, sendMessage, killBot }
