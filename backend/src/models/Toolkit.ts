import { StructuredToolInterface } from "@langchain/core/tools";
import { RedisVectorStore } from "@langchain/redis";
import { createRetrieverTool } from "langchain/tools/retriever";

export class ToolKit {
    private tools: StructuredToolInterface[] = [];

    constructor(vector_store: RedisVectorStore) {
        this.addRetrieverTool(vector_store);
    }

    private addRetrieverTool(vector_store: RedisVectorStore) {
        const retriever = vector_store.asRetriever({
            k: 10,
        })
        const retrieverTool = createRetrieverTool(retriever, {
            name: "website_information",
            description: "Use this tool to retrieve information that is related Bridges To Science",
        });
        this.tools.push(retrieverTool as StructuredToolInterface);
    }

    // private addLinkTool(): void {
    //     const linkTool = new DynamicStructuredTool({
    //         name: "Find Relevant Links",
    //         description: "Use this tool only if the user explicitly asks for URLs or Links.",
    //         schema: z.object({
    //             query: z.string().describe("The user query or input"),
    //         }) as any,
    //         func: async({ query }) => {
    //             const cleanQuery = query.toLowerCase().trim();
    //             const prompt = ChatPromptTemplate.fromTemplate(Instruction.selection);
    //             const chain = prompt.pipe(this.linkModel);
    //             const response = await chain.invoke({
    //                 input: cleanQuery,
    //                 json_links: relevant_links.map((l, i) => `${i + 1}. ${l.label} - ${l.url}`).join('\n'),
    //             })
    //             return response.text;
    //         }
    //     });

    //     this.tools.push(linkTool);
    // }

    getTools(): StructuredToolInterface[] {
        return this.tools;
    }
}