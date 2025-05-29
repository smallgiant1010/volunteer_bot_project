import { ChatOllama } from "@langchain/ollama";
import * as dotenv from "dotenv";
import Instruction from "./constants/Instructions";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { VectorStorageManager } from "./VectorStorageManager";
import { LLMS } from "./constants/LLMs";
import { Runnable } from "@langchain/core/runnables";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

dotenv.config();

export class ChatBot {
    private chain!: Runnable;
    private memory: { type: string, content: string }[] = [{
        type: "ai",
        content: "Hello, I am VolunteerConnect. How may I help you?"
    }];
    private vsmanager!: VectorStorageManager;

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

        bot.vsmanager = await VectorStorageManager.create(session_id);

        const stuffDocumentsChain = await createStuffDocumentsChain({
            llm,
            prompt,
        });

        const retriever = bot.getVSManager().getVectorStore().asRetriever({
            k: 5,
        });

        const retrieverPrompt = ChatPromptTemplate.fromMessages([
            new MessagesPlaceholder("chat_history"),
            ["user", "{input}"],
            ["user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation"],
        ]);

        const historyAwareRetriever = await createHistoryAwareRetriever({
            llm,
            retriever,
            rephrasePrompt: retrieverPrompt
        });
        
        bot.chain = await createRetrievalChain({
            retriever: historyAwareRetriever,
            combineDocsChain: stuffDocumentsChain,
        });

        return bot;
    }

    private createLLM(is_being_tested: boolean): ChatOllama {
        return new ChatOllama({
            model: LLMS.chat_model as string,
            // baseUrl: "",
            temperature: 0,
            verbose: is_being_tested
        });
    }

    async sendMessage(message: string) {
        const { answer } = await this.chain.invoke({
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
    }

    getChatHistory(): { type: string, content: string }[] {
        return this.memory;
    }

    getVSManager(): VectorStorageManager {
        return this.vsmanager;
    }

}