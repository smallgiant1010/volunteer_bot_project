import express from "express";
import { getSessionMessages, headPopulateData, sendMessage } from "../controllers/controller";

const router = express.Router();

// Methods
router.head("/", headPopulateData);

router.get("/retrieveChatMessages", getSessionMessages);

router.post("/sendMessageToLLM", sendMessage);

export default router;




