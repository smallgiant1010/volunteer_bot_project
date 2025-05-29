import express from "express";
import { getSessionMessages, headPopulateData, killBot, sendMessage } from "../controllers/controller";

const router = express.Router();

// Methods
router.head("/", headPopulateData);

router.get("/retrieveChatMessages", getSessionMessages);

router.post("/sendMessageToLLM", sendMessage);

// technically delete 
router.post("/sendKillBot", killBot)

export default router;




