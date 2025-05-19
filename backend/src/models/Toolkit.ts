import { DynamicStructuredTool, StructuredToolInterface } from "@langchain/core/tools";
import { RedisVectorStore } from "@langchain/redis";
import { createRetrieverTool } from "langchain/tools/retriever";
import { z } from "zod";
import { relevant_links } from "./constants/Links";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { load } from "cheerio";

export class ToolKit {
    private tools: StructuredToolInterface[] = [];

    constructor(vector_store: RedisVectorStore) {
        this.addRetrieverTool(vector_store);
        this.addLinkTool();
    }

    private addRetrieverTool(vector_store: RedisVectorStore) {
        const retriever = vector_store.asRetriever({
            k: 10,
        })
        const retrieverTool = createRetrieverTool(retriever, {
            name: "website_information",
            description: "Use this tool to answer factual questions about Bridges To Science. This tool does not return URLs or links, only information.",
        });
        this.tools.push(retrieverTool as StructuredToolInterface);
    }

    private addLinkTool(): void {
        const linkTool = new DynamicStructuredTool({
            name: "Find Relevant Links",
            description: "Use this tool only if the user explicitly asks for URLs or Links.",
            schema: z.object({
                query: z.string().describe("The user's query or question."),
            }) as any,
            func: async({ query }) => {
                const cleanQuery = query.toLowerCase().trim();
                const allLinks = await this.deepSearchLinks();
                const scored = allLinks.map(link => ({
                    ...link,
                    score: link.label.toLowerCase().includes(cleanQuery) ? 1 : 0,
                }));

                const bestMatched = scored.sort((a, b) => b.score - a.score)[0];
                return bestMatched.url ?? "I could not find a relevant link that matches your case"
            }
        });

        this.tools.push(linkTool);
    }

    private async deepSearchLinks() {
        const linkSet: { url: string, label: string }[] = [];
        const seenUrls: Set<string> = new Set();
        for(let link of relevant_links) {
            seenUrls.add(link.url);
        }
        await Promise.all(relevant_links.map(async (link) => {
            const loader = new CheerioWebBaseLoader(link.url);
            const docs = await loader.load();
            if(!docs[0].pageContent) return
            const $ = load(docs[0].pageContent);
            $("a").each((_, el) => {
                const href = $(el).attr("href") as string;
                const match = href.match(/www\.([^.]+)/);
                const label = match ? match[1] : href;
                if (href && !seenUrls.has(href)) {
                    seenUrls.add(href);
                    linkSet.push({
                        url: href,
                        label: label,
                    });
                }
            });
        }));

        return linkSet.concat(relevant_links);
    }

    getTools(): StructuredToolInterface[] {
        return this.tools;
    }
}