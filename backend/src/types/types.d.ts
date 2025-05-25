import { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            chat_bot_session_id: string;
        }
    }
}