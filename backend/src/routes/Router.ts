import express from "express";
import { getSessionMessages, headUptimeRobot, killBot, sendMessage } from "../controllers/controller";

const router = express.Router();

// Methods
router.head("/", headUptimeRobot);

router.get("/retrieveChatMessages", getSessionMessages);

router.post("/sendMessageToLLM", sendMessage);

// technically delete 
router.post("/sendKillBot", killBot)

export default router;




