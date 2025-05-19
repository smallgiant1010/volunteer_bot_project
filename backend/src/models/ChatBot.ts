import { ChatOllama } from "@langchain/ollama";
import { createStructuredChatAgent, AgentExecutor } from "langchain/agents";
import * as dotenv from "dotenv";
import Instruction from "./constants/Instructions";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { VectorStorageManager } from "./VectorStorageManager";
import { MemoryManager } from "./MemoryManager";
import { ToolKit } from "./Toolkit";
import { LLMS } from "./constants/LLMs";

dotenv.config();

export class ChatBot {
    private agentExecutor!: AgentExecutor;
    private memory: MemoryManager;
    private vsmanager!: VectorStorageManager;

    constructor(
        readonly session_id: string,
        readonly is_being_tested: boolean,
    ) {
        this.memory = MemoryManager.create(session_id);
    }

    static async create(session_id: string, is_being_tested: boolean): Promise<ChatBot> {
        const bot = new ChatBot(session_id, is_being_tested);

        const llm = bot.createLLM(is_being_tested);

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", Instruction.objective],
            new MessagesPlaceholder("chat_history"),
            ["user", "{input}"],
        ]);

        bot.vsmanager = await VectorStorageManager.create(session_id);

        const tools = new ToolKit(bot.vsmanager.getVectorStore()).getTools();

        const agent = await createStructuredChatAgent({
            llm,
            prompt,
            tools,
        });

        await bot.memory.getBufferMemory().loadMemoryVariables({});

        bot.agentExecutor = new AgentExecutor({
            agent,
            tools,
            memory: bot.memory.getBufferMemory(),
        });

        return bot;
    }

    private createLLM(is_being_tested: boolean): ChatOllama {
        return new ChatOllama({
            model: LLMS.chat_model as string,
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested
        });
    }

    async sendMessage(message: string) {
        const { output } = await this.agentExecutor.invoke({
            input: message,
        });
        console.log("Agent output:", output);
        return output;
    }

    async getChatHistory(): Promise<{ type: string, content: string }[]> {
        return await this.memory.getChatHistory();
    }

    getVSManager(): VectorStorageManager {
        return this.vsmanager;
    }
}