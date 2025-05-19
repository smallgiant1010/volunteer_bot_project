import { Request, Response } from "express";
import { ChatBot } from "../models/ChatBot";

const headPopulateData = async (req: Request, res: Response) => {
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    try {
        const chatbot: ChatBot = await ChatBot.create(chat_bot_session_id as string, true);
        await chatbot.getVSManager().refreshInformationInVectorStore();
        res.status(200).json(null);
    }
    catch(err) {
        console.log(err);
        res.status(500).json(null);
    }
}

const getSessionMessages = async (req : Request, res: Response) => {
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    try {
        const chatBot: ChatBot = await ChatBot.create(chat_bot_session_id as string, true);
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
    const chat_bot_session_id = req.cookies.chat_bot_session_id;
    const { message } = req.body;
    try {
        const chatbot: ChatBot = await ChatBot.create(chat_bot_session_id as string, true);
        const response = await chatbot.sendMessage(message as string);
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
