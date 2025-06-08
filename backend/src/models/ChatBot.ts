// import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatMistralAI } from "@langchain/mistralai";
import * as dotenv from "dotenv";
import { Instruction, LLMS } from "../constants/Constants";
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { VectorStorageManager } from "./VectorStorageManager";
import { createStructuredChatAgent, AgentExecutor } from "langchain/agents";
import { Toolkit } from "./Toolkit";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

dotenv.config();

export class ChatBot {
    private executor!: AgentExecutor;
    private memory: BaseMessage[] = [new AIMessage({
        content: "Hello, I am VolunteerConnect. How may I help you?",
        additional_kwargs: {},
    })];
    private vsmanager!: VectorStorageManager;

    constructor(
        readonly session_id: string,
        readonly is_being_tested: boolean,
    ) {}

    static async create(session_id: string, is_being_tested: boolean): Promise<ChatBot> {
        const bot = new ChatBot(session_id, is_being_tested);

        const llm = bot.createLLM(is_being_tested);

        const prompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(Instruction.objective),
            new MessagesPlaceholder("chat_history"),
            HumanMessagePromptTemplate.fromTemplate("{input}"),
        ]);

        bot.vsmanager = new VectorStorageManager();

        const toolkit = new Toolkit(bot.vsmanager);

        const tools = toolkit.getTools();

        const agent = await createStructuredChatAgent({
            llm,
            prompt,
            tools,
        });

        bot.executor = new AgentExecutor({
            agent,
            tools,
            returnIntermediateSteps: false,
        })

        return bot;
    }

    private createLLM(is_being_tested: boolean): ChatGoogleGenerativeAI {
        return new ChatGoogleGenerativeAI({
            model: LLMS.DEV_CHAT_MODEL as string,
            // baseUrl: "",
            temperature: 0.3,
            verbose: is_being_tested,
            maxRetries: 2
        });
    }

    async sendMessage(message: string) {
        const { output } = await this.executor.invoke({
            input: message,
            chat_history: this.memory,
        });
        this.memory.push(new HumanMessage({
            content: message,
            additional_kwargs: {},
        }));
        this.memory.push(new AIMessage({
            content: output,
            additional_kwargs: {},
        }));
        console.log("Agent output:", output);
        return output;
    }

    getChatHistory(): { type: string, content: string }[] {
        return this.memory.map(base => {
            return {
                type: base.getType(),
                content: base.text,
            };
        });
    }

    getVSManager(): VectorStorageManager {
        return this.vsmanager;
    }

}