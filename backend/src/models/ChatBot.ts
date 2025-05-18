import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { BufferMemory } from "langchain/memory";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { DynamicStructuredTool, DynamicTool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import * as dotenv from "dotenv";
import Instruction from "./Instructions";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createRetrieverTool } from "langchain/tools/retriever";
import { RedisVectorStore } from "@langchain/redis";
import { createClient } from "redis";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { load } from "cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { RedisClientType } from "redis";


dotenv.config();

export class ChatBot {
    private agentExecutor!: AgentExecutor;
    private vector_store!: RedisVectorStore;
    private indexName: string = "volunteerBot";
    private client!: RedisClientType;

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

        this.client = createClient({
            url: process.env.REDIS_URL ?? "redis://localhost:6379",
        });

        await this.client.connect();

        this.vector_store = new RedisVectorStore(embeddingsModel, {
            redisClient: this.client,
            indexName: this.indexName
        });
    }

    async RefreshInformationInVectorStore() {
        const keys = await this.client.keys(`${this.indexName}:*`);
        if (keys.length > 0) {
            await this.client.del(keys);
        }

        const loaders: CheerioWebBaseLoader[] = [];
        const blogLinks = await this.blogLoader();
        const links: string[] = [
            "https://www.bridgestoscience.org/about/",
            "https://www.bridgestoscience.org/programs/",
            "https://www.bridgestoscience.org/blog/",
            "https://www.bridgestoscience.org/get-involved/#volunteer",
            "https://www.bridgestoscience.org/get-involved/",
            "https://www.bridgestoscience.org/",
            ...blogLinks,
        ];
        
        for(let link of links) {
            loaders.push(new CheerioWebBaseLoader(link));
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 200,
            chunkOverlap: 20,
        });

        const fullData = await Promise.all(loaders.map(loader => loader.load()));

        const splitDocs = await Promise.all(fullData.map(data => splitter.splitDocuments(data)));

        for (const docs of splitDocs) {
            await this.vector_store.addDocuments(docs);
        }
    }

    private async blogLoader() {
        const loader: CheerioWebBaseLoader = new CheerioWebBaseLoader("https://www.bridgestoscience.org/blog/");
        const docs = await loader.load();

        const links: string[] = [];
        const $ = load(docs[0].pageContent);
        
        $("a").each((_, el) => {
            const href = $(el).attr("href") as string;
            if (href.includes("bridgestoscience.org")) links.push(href);
        });

        return links;
    }


    private createLLM(is_being_tested: boolean): ChatOllama {
        const model = new ChatOllama({
            model: "PetrosStav/gemma3-tools:12b",
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested
        });
        return model;
    }

    private createMemory(session_id: string): BufferMemory {
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

    private createTools(): any[] {
        const tools: (StructuredTool | DynamicTool | DynamicStructuredTool)[] = [];
        const retriever = this.vector_store.asRetriever({
            k: 4,
        })
        const retrieverTool = createRetrieverTool(retriever, {
            name: "website_information",
            description: "Use this tool to retrieve information regarding any information about Bridges To Science that does not involve links as compared to your other tools.",
        });
        tools.push(retrieverTool as DynamicStructuredTool);
        return tools;
    }

    getExecutor(): AgentExecutor {
        return this.agentExecutor;
    }
}