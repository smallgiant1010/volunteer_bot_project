"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const establishSessionCookies = (req, res, next) => {
    const { session_id } = req.headers;
    if (!session_id) {
        res.cookie("session_id", (0, uuid_1.v6)(), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        });
    }
    next();
};
exports.default = establishSessionCookies;
