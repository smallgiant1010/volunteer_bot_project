import { v6 as uuidv6 } from "uuid";
import { Request, Response, NextFunction } from "express";

// Ensures A Session ID Is Preset Throughout All Calls
const establishSessionCookies = (req: Request,res: Response, next: NextFunction): void => {
    // Checks For Session ID
    const chat_bot_session_id = req.cookies.chat_bot_session_id;

    // Creates A Cookie If There Isn't A ID Present
    if(!chat_bot_session_id) {
        res.cookie("chat_bot_session_id", uuidv6(), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        });
    }

    // Moves Onto to Next Middleware
    next();
}

export default establishSessionCookies;