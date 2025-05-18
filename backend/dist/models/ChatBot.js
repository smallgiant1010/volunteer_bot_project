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
const memory_1 = require("langchain/memory");
const upstash_redis_1 = require("@langchain/community/stores/message/upstash_redis");
const agents_1 = require("langchain/agents");
const dotenv = __importStar(require("dotenv"));
const Instructions_1 = __importDefault(require("./Instructions"));
const prompts_1 = require("@langchain/core/prompts");
const retriever_1 = require("langchain/tools/retriever");
const redis_1 = require("@langchain/redis");
const redis_2 = require("redis");
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const cheerio_2 = require("cheerio");
const text_splitter_1 = require("langchain/text_splitter");
dotenv.config();
class ChatBot {
    constructor(session_id, is_being_tested) {
        this.session_id = session_id;
        this.is_being_tested = is_being_tested;
        this.indexName = "volunteerBot";
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
            this.client = (0, redis_2.createClient)({
                url: (_a = process.env.REDIS_URL) !== null && _a !== void 0 ? _a : "redis://localhost:6379",
            });
            yield this.client.connect();
            this.vector_store = new redis_1.RedisVectorStore(embeddingsModel, {
                redisClient: this.client,
                indexName: this.indexName
            });
        });
    }
    RefreshInformationInVectorStore() {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = yield this.client.keys(`${this.indexName}:*`);
            if (keys.length > 0) {
                yield this.client.del(keys);
            }
            const loaders = [];
            const blogLinks = yield this.blogLoader();
            const links = [
                "https://www.bridgestoscience.org/about/",
                "https://www.bridgestoscience.org/programs/",
                "https://www.bridgestoscience.org/blog/",
                "https://www.bridgestoscience.org/get-involved/#volunteer",
                "https://www.bridgestoscience.org/get-involved/",
                "https://www.bridgestoscience.org/",
                ...blogLinks,
            ];
            for (let link of links) {
                loaders.push(new cheerio_1.CheerioWebBaseLoader(link));
            }
            const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
                chunkSize: 200,
                chunkOverlap: 20,
            });
            const fullData = yield Promise.all(loaders.map(loader => loader.load()));
            const splitDocs = yield Promise.all(fullData.map(data => splitter.splitDocuments(data)));
            for (const docs of splitDocs) {
                yield this.vector_store.addDocuments(docs);
            }
        });
    }
    blogLoader() {
        return __awaiter(this, void 0, void 0, function* () {
            const loader = new cheerio_1.CheerioWebBaseLoader("https://www.bridgestoscience.org/blog/");
            const docs = yield loader.load();
            const links = [];
            const $ = (0, cheerio_2.load)(docs[0].pageContent);
            $("a").each((_, el) => {
                const href = $(el).attr("href");
                if (href.includes("bridgestoscience.org"))
                    links.push(href);
            });
            return links;
        });
    }
    createLLM(is_being_tested) {
        const model = new ollama_1.ChatOllama({
            model: "PetrosStav/gemma3-tools:12b",
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested
        });
        return model;
    }
    createMemory(session_id) {
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
    }
    createTools() {
        const tools = [];
        const retriever = this.vector_store.asRetriever({
            k: 4,
        });
        const retrieverTool = (0, retriever_1.createRetrieverTool)(retriever, {
            name: "website_information",
            description: "Use this tool to retrieve information regarding any information about Bridges To Science that does not involve links as compared to your other tools.",
        });
        tools.push(retrieverTool);
        return tools;
    }
    getExecutor() {
        return this.agentExecutor;
    }
}
exports.ChatBot = ChatBot;
