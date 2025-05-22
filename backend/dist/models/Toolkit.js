"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolKit = void 0;
const retriever_1 = require("langchain/tools/retriever");
class ToolKit {
    constructor(vector_store) {
        this.tools = [];
        this.addRetrieverTool(vector_store);
    }
    addRetrieverTool(vector_store) {
        const retriever = vector_store.asRetriever({
            k: 10,
        });
        const retrieverTool = (0, retriever_1.createRetrieverTool)(retriever, {
            name: "website_information",
            description: "Use this tool to retrieve information that is related Bridges To Science",
        });
        this.tools.push(retrieverTool);
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
    getTools() {
        return this.tools;
    }
}
exports.ToolKit = ToolKit;
