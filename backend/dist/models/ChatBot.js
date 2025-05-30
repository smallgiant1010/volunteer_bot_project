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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBot = void 0;
const ollama_1 = require("@langchain/ollama");
const dotenv = __importStar(require("dotenv"));
const Instructions_1 = __importDefault(require("./constants/Instructions"));
const prompts_1 = require("@langchain/core/prompts");
const VectorStorageManager_1 = require("./VectorStorageManager");
const LLMs_1 = require("./constants/LLMs");
const retrieval_1 = require("langchain/chains/retrieval");
const history_aware_retriever_1 = require("langchain/chains/history_aware_retriever");
const combine_documents_1 = require("langchain/chains/combine_documents");
dotenv.config();
class ChatBot {
    constructor(session_id, is_being_tested) {
        this.session_id = session_id;
        this.is_being_tested = is_being_tested;
        this.memory = [{
                type: "ai",
                content: "Hello, I am VolunteerConnect. How may I help you?"
            }];
    }
    static create(session_id, is_being_tested) {
        return __awaiter(this, void 0, void 0, function* () {
            const bot = new ChatBot(session_id, is_being_tested);
            const llm = bot.createLLM(is_being_tested);
            const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                ["system", Instructions_1.default.objective],
                new prompts_1.MessagesPlaceholder("chat_history"),
                ["user", "{input}"],
            ]);
            bot.vsmanager = yield VectorStorageManager_1.VectorStorageManager.create(session_id);
            const stuffDocumentsChain = yield (0, combine_documents_1.createStuffDocumentsChain)({
                llm,
                prompt,
            });
            const retriever = bot.getVSManager().getVectorStore().asRetriever({
                k: 10,
            });
            const retrieverPrompt = prompts_1.ChatPromptTemplate.fromMessages([
                new prompts_1.MessagesPlaceholder("chat_history"),
                ["user", "{input}"],
                ["user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation"],
            ]);
            const historyAwareRetriever = yield (0, history_aware_retriever_1.createHistoryAwareRetriever)({
                llm,
                retriever,
                rephrasePrompt: retrieverPrompt
            });
            bot.chain = yield (0, retrieval_1.createRetrievalChain)({
                retriever: historyAwareRetriever,
                combineDocsChain: stuffDocumentsChain,
            });
            return bot;
        });
    }
    createLLM(is_being_tested) {
        return new ollama_1.ChatOllama({
            model: LLMs_1.LLMS.chat_model,
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested
        });
    }
    sendMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { answer } = yield this.chain.invoke({
                input: message,
                chat_history: this.memory,
            });
            this.memory.push({
                type: "human",
                content: message,
            });
            this.memory.push({
                type: "ai",
                content: answer,
            });
            console.log("Agent output:", answer);
            return answer;
        });
    }
    getChatHistory() {
        return this.memory;
    }
    getVSManager() {
        return this.vsmanager;
    }
}
exports.ChatBot = ChatBot;
