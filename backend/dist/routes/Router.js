"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("../controllers/controller");
const router = express_1.default.Router();
// Methods
router.head("/", controller_1.headPopulateData);
router.get("/retrieveChatMessages", controller_1.getSessionMessages);
router.post("/sendMessageToLLM", controller_1.sendMessage);
// technically delete 
router.post("/sendKillBot", controller_1.killBot);
exports.default = router;
