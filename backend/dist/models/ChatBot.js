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
const ollama_1 = require("@langchain/ollama");
const memory_1 = require("langchain/memory");
const upstash_redis_1 = require("@langchain/community/stores/message/upstash_redis");
const agents_1 = require("langchain/agents");
const dotenv = __importStar(require("dotenv"));
const Instructions_1 = __importDefault(require("./Instructions"));
const prompts_1 = require("@langchain/core/prompts");
const redis_1 = require("@langchain/redis");
const redis_2 = require("redis");
dotenv.config();
class ChatBot {
    constructor(session_id, is_being_tested) {
        this.session_id = session_id;
        this.is_being_tested = is_being_tested;
        this.createLLM = (is_being_tested) => {
            const model = new ollama_1.ChatOllama({
                model: "PetrosStav/gemma3-tools:12b",
                // baseUrl: "",
                temperature: 0.3,
                verbose: is_being_tested
            });
            return model;
        };
        this.createMemory = (session_id) => {
            const memory = new memory_1.BufferMemory({
                memoryKey: "chat_history",
                chatHistory: new upstash_redis_1.UpstashRedisChatMessageHistory({
                    sessionId: session_id,
                    sessionTTL: 3600,
                    config: {
                        url: process.env.UPSTASH_REDIS_REST_URL,
                        token: process.env.UPSTASH_REDIS_REST_TOKEN,
                    },
                }),
            });
            return memory;
        };
        this.createTools = () => {
            const tools = [];
            return tools;
        };
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
            const tools = bot.createTools();
            const agent = yield (0, agents_1.createReactAgent)({
                llm,
                prompt,
                tools,
            });
            bot.agentExecutor = new agents_1.AgentExecutor({
                agent,
                tools,
                memory: bot.createMemory(session_id),
            });
            yield bot.initializeVectorStore();
            return bot;
        });
    }
    initializeVectorStore() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const embeddingsModel = new ollama_1.OllamaEmbeddings({
                model: "bge-large:latest",
            });
            const client = (0, redis_2.createClient)({
                url: (_a = process.env.REDIS_URL) !== null && _a !== void 0 ? _a : "redis://localhost:6379",
            });
            yield client.connect();
            this.vector_store = new redis_1.RedisVectorStore(embeddingsModel, {
                redisClient: client,
                indexName: "volunteerBot"
            });
        });
    }
    RefreshInformationInVectorStore() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    getExecutor() {
        return this.agentExecutor;
    }
}
