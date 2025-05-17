import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { BufferMemory } from "langchain/memory";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { DynamicTool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import * as dotenv from "dotenv";
import Instruction from "./Instructions";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createRetrieverTool } from "langchain/tools/retriever";
import { RedisVectorStore } from "@langchain/redis";
import { createClient } from "redis";


dotenv.config();

class ChatBot {
    private agentExecutor!: AgentExecutor;
    private vector_store!: RedisVectorStore;

    constructor(
        readonly session_id: string,
        readonly is_being_tested: boolean,
    ) {}

    static async create(session_id: string, is_being_tested: boolean): Promise<ChatBot> {
        const bot = new ChatBot(session_id, is_being_tested);

        const llm = bot.createLLM(is_being_tested);
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", Instruction.objective],
            new MessagesPlaceholder("chat_history"),
            ["user", "{input}"],
        ]);
        const tools = bot.createTools();

        const agent = await createReactAgent({
            llm,
            prompt,
            tools,
        });

        bot.agentExecutor = new AgentExecutor({
            agent,
            tools,
            memory: bot.createMemory(session_id),
        });

        await bot.initializeVectorStore();
        
        return bot;
    }

    private async initializeVectorStore() {
        const embeddingsModel: OllamaEmbeddings = new OllamaEmbeddings({
            model: "bge-large:latest",
        });

        const client = createClient({
            url: process.env.REDIS_URL ?? "redis://localhost:6379",
        });

        await client.connect();

        this.vector_store = new RedisVectorStore(embeddingsModel, {
            redisClient: client,
            indexName: "volunteerBot"
        });
    }

    private async RefreshInformationInVectorStore() {

    }

    private createLLM = (is_being_tested: boolean): ChatOllama => {
        const model = new ChatOllama({
            model: "PetrosStav/gemma3-tools:12b",
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested
        });
        return model;
    }

    private createMemory = (session_id: string): BufferMemory => {
        const memory = new BufferMemory({
            memoryKey: "chat_history",
            chatHistory: new UpstashRedisChatMessageHistory({
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

    private createTools = (): any[] => {
        const tools: (StructuredTool | DynamicTool)[] = [];
        return tools;
    }

    getExecutor(): AgentExecutor {
        return this.agentExecutor;
    }
}