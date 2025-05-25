"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
// Ensures A Session ID Is Preset Throughout All Calls
const establishSessionCookies = (req, res, next) => {
    // Checks For Session ID
    let chat_bot_session_id = req.cookies.chat_bot_session_id;
    // Creates A Cookie If There Isn't A ID Present
    if (!chat_bot_session_id) {
        chat_bot_session_id = (0, uuid_1.v6)();
        res.cookie("chat_bot_session_id", chat_bot_session_id, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        });
    }
    // send cookie in header
    req.chat_bot_session_id = chat_bot_session_id;
    // Moves Onto to Next Middleware
    next();
};
exports.default = establishSessionCookies;
