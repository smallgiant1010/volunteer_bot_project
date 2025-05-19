import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { BufferMemory } from "langchain/memory";
import * as dotenv from "dotenv";
import { BaseMessage } from "@langchain/core/messages";
import { LLMS } from "./constants/LLMs";

dotenv.config();

export class MemoryManager {
    private memory!: BufferMemory;

    constructor(readonly session_id: string) {}

    static create(session_id:string): MemoryManager {
        const memoryManager = new MemoryManager(session_id);

        memoryManager.memory = new BufferMemory({
            memoryKey: "chat_history",
            returnMessages: true,
            outputKey: "output",
            chatHistory: new UpstashRedisChatMessageHistory({
                sessionId: session_id,
                sessionTTL: LLMS.timeout as number,
                config: {
                    url: process.env.UPSTASH_REDIS_REST_URL!,
                    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
                    enableTelemetry: false,
                },
            }),
        });

        return memoryManager;
    }

    async getChatHistory(): Promise<{ type: string, content: string }[]> {
        const messages: BaseMessage[] = await this.memory.chatHistory.getMessages();

        return messages.map(message => ({
            type: message.getType(),
            content: message.text,
        }));
    }

    getBufferMemory(): BufferMemory {
        return this.memory;
    }
}