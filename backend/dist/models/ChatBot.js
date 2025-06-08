"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBot = void 0;
// import { ChatOllama } from "@langchain/ollama";
const google_genai_1 = require("@langchain/google-genai");
// import { ChatMistralAI } from "@langchain/mistralai";
const dotenv = __importStar(require("dotenv"));
const Constants_1 = require("../constants/Constants");
const prompts_1 = require("@langchain/core/prompts");
const VectorStorageManager_1 = require("./VectorStorageManager");
const agents_1 = require("langchain/agents");
const Toolkit_1 = require("./Toolkit");
const messages_1 = require("@langchain/core/messages");
dotenv.config();
class ChatBot {
    constructor(session_id, is_being_tested) {
        this.session_id = session_id;
        this.is_being_tested = is_being_tested;
        this.memory = [new messages_1.AIMessage({
                content: "Hello, I am VolunteerConnect. How may I help you?",
                additional_kwargs: {},
            })];
    }
    static create(session_id, is_being_tested) {
        return __awaiter(this, void 0, void 0, function* () {
            const bot = new ChatBot(session_id, is_being_tested);
            const llm = bot.createLLM(is_being_tested);
            const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                prompts_1.SystemMessagePromptTemplate.fromTemplate(Constants_1.Instruction.objective),
                new prompts_1.MessagesPlaceholder("chat_history"),
                prompts_1.HumanMessagePromptTemplate.fromTemplate("{input}"),
            ]);
            bot.vsmanager = new VectorStorageManager_1.VectorStorageManager();
            const toolkit = new Toolkit_1.Toolkit(bot.vsmanager);
            const tools = toolkit.getTools();
            const agent = yield (0, agents_1.createStructuredChatAgent)({
                llm,
                prompt,
                tools,
            });
            bot.executor = new agents_1.AgentExecutor({
                agent,
                tools,
                returnIntermediateSteps: false,
            });
            return bot;
        });
    }
    createLLM(is_being_tested) {
        return new google_genai_1.ChatGoogleGenerativeAI({
            model: Constants_1.LLMS.DEV_CHAT_MODEL,
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested,
            maxRetries: 2
        });
    }
    sendMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { output } = yield this.executor.invoke({
                input: message,
                chat_history: this.memory,
            });
            this.memory.push(new messages_1.HumanMessage({
                content: message,
                additional_kwargs: {},
            }));
            this.memory.push(new messages_1.AIMessage({
                content: output,
                additional_kwargs: {},
            }));
            console.log("Agent output:", output);
            return output;
        });
    }
    getChatHistory() {
        return this.memory.map(base => {
            return {
                type: base.getType(),
                content: base.text,
            };
        });
    }
    getVSManager() {
        return this.vsmanager;
    }
}
exports.ChatBot = ChatBot;
