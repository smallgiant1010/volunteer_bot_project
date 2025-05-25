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

const headPopulateData = async (_: Request, res: Response) => {
    try {
        const chatbot: ChatBot = await getOrCreateChatBot("temporaryStringForUptimeRobot");
        await chatbot.getVSManager().refreshInformationInVectorStore();
        res.status(200).json(null);
    }
    catch(err) {
        console.log(err);
        res.status(500).json(null);
    }
}

const getSessionMessages = async (req : Request, res: Response) => {
    const chat_bot_session_id = req.chat_bot_session_id;
    try {
        console.log(chat_bot_session_id);
        const chatBot: ChatBot = await getOrCreateChatBot(chat_bot_session_id);
        const history = await chatBot.getChatHistory();
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

export { headPopulateData, getSessionMessages, sendMessage }
