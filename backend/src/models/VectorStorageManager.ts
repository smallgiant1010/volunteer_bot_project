import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RedisVectorStore } from "@langchain/redis";
import { load } from "cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient, RedisClientType } from "redis";
import { LLMS } from "./constants/LLMs";
import { relevant_links } from "./constants/Links";
import * as dotenv from "dotenv";

dotenv.config();

export class VectorStorageManager {
    private vector_store!: RedisVectorStore;
    private indexName: string = "volunteerBot";
    private client!: RedisClientType;

    constructor(readonly session_id: string) {}

    static async create(session_id: string): Promise<VectorStorageManager> {
        const vector_store_manager = new VectorStorageManager(session_id);

        const embeddingsModel: OllamaEmbeddings = new OllamaEmbeddings({
            model: LLMS.embedding_model as string,
        });

        vector_store_manager.client = createClient({
            username: "default",
            password: process.env.REDIS_PASSWORD as string,
            socket: {
                host: process.env.REDIS_URL as string,
                port: 16686,
            },
        });

        await vector_store_manager.client.connect();

        vector_store_manager.vector_store = new RedisVectorStore(embeddingsModel, {
            redisClient: vector_store_manager.client,
            indexName: vector_store_manager.indexName
        });

        return vector_store_manager;
    }

    async refreshInformationInVectorStore() {
        await this.client.flushDb();
        // const blogLinks = await this.blogLoader();
        // const links: { url: string, label: string }[] = [...blogLinks, ...relevant_links];

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });

        const validLinks:{ url: string, label: string }[] = relevant_links.filter(link =>
            link.url.includes('www.bridgestoscience.org') && !link.url.includes(".pdf")
        );

        const pageData = await Promise.all(validLinks.map(async (link) => {
            try {
                const loader = new CheerioWebBaseLoader(link.url);
                const docs = await loader.load();

                return docs.map((doc) => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        url: link.url,
                        label: link.label,
                    },
                }));
            } catch (error) {
                console.error(`Error loading ${link.url}:`, error);
                return []; 
            }
        }));
        
        const moreLinks = await Promise.all(relevant_links.map(async (link) => {
            try {
                if (validLinks.includes(link)) {
                    const response = await fetch(link.url); 
                    const html = await response.text();
                    const $ = load(html);

                    const associatedLinks: string[] = [];

                    $("a").each((_, element) => {
                        const href = $(element).attr("href");
                        const innerText = $(element).text();
                        if (href) {
                            associatedLinks.push(`${innerText ?? ""} - ${href}`);
                        }
                    });

                    return {
                        metadata: {
                            url: link.url,
                            label: link.label,
                        },
                        pageContent: `External Sources of ${link.label} Link: ${associatedLinks.join("\n")}`,
                    };
                }
                return {
                    metadata: {
                        url: link.url,
                        label: link.label,
                    },
                    pageContent: `${link.label} - ${link.url}`,
                };
            } catch (error) {
                console.error(`Error fetching ${link.url}:`, error);
            }

            // fallback content
            console.log(link);
            return {
                metadata: {
                    url: link.url,
                    label: link.label,
                },
                pageContent: `${link.label} - ${link.url}`,
            };
        }));

        const fullData = pageData.concat(moreLinks);

        const allDocsWithMetadata = fullData.flat();

        const splitDocs = await Promise.all(allDocsWithMetadata.map(data => splitter.splitDocuments([data])));

        const flattenedSplitDocs = splitDocs.flat();

        await this.vector_store.addDocuments(flattenedSplitDocs);
    }

    // private async blogLoader() {
    //     const loader: CheerioWebBaseLoader = new CheerioWebBaseLoader("https://www.bridgestoscience.org/blog/");
    //     const docs = await loader.load();

    //     const links: { url: string, label: string }[] = [];
    //     const $ = load(docs[0].pageContent);
        
    //     $("a").each((_, el) => {
    //         const href = $(el).attr("href") as string;
    //         const innerText = $(el).text() as string;
    //         if (href.includes("bridgestoscience.org")) {
    //             links.push({
    //                 url: href,
    //                 label: innerText,
    //             });
    //         }
    //     });

    //     return links;
    // }

    getVectorStore(): RedisVectorStore {
        return this.vector_store;
    }
}