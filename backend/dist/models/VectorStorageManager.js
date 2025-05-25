"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStorageManager = void 0;
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const ollama_1 = require("@langchain/ollama");
const redis_1 = require("@langchain/redis");
const cheerio_2 = require("cheerio");
const text_splitter_1 = require("langchain/text_splitter");
const redis_2 = require("redis");
const LLMs_1 = require("./constants/LLMs");
const Links_1 = require("./constants/Links");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class VectorStorageManager {
    constructor(session_id) {
        this.session_id = session_id;
        this.indexName = "volunteerBot";
    }
    static create(session_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const vector_store_manager = new VectorStorageManager(session_id);
            const embeddingsModel = new ollama_1.OllamaEmbeddings({
                model: LLMs_1.LLMS.embedding_model,
            });
            vector_store_manager.client = (0, redis_2.createClient)({
                username: "default",
                password: process.env.REDIS_PASSWORD,
                socket: {
                    host: process.env.REDIS_URL,
                    port: 16686,
                },
            });
            yield vector_store_manager.client.connect();
            vector_store_manager.vector_store = new redis_1.RedisVectorStore(embeddingsModel, {
                redisClient: vector_store_manager.client,
                indexName: vector_store_manager.indexName
            });
            return vector_store_manager;
        });
    }
    refreshInformationInVectorStore() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.flushDb();
            // const blogLinks = await this.blogLoader();
            // const links: { url: string, label: string }[] = [...blogLinks, ...relevant_links];
            const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
                chunkSize: 500,
                chunkOverlap: 30,
            });
            const validLinks = Links_1.relevant_links.filter(link => link.url.includes('www.bridgestoscience.org') && !link.url.includes(".pdf"));
            const pageData = yield Promise.all(validLinks.map((link) => __awaiter(this, void 0, void 0, function* () {
                const loader = new cheerio_1.CheerioWebBaseLoader(link.url);
                const docs = yield loader.load();
                return docs.map((doc) => (Object.assign(Object.assign({}, doc), { metadata: Object.assign(Object.assign({}, doc.metadata), { url: link.url, label: link.label }) })));
            })));
            const moreLinks = yield Promise.all(Links_1.relevant_links.map((link) => __awaiter(this, void 0, void 0, function* () {
                if (validLinks.includes(link)) {
                    const response = yield fetch(link.url);
                    const html = yield response.text();
                    const $ = (0, cheerio_2.load)(html);
                    const associatedLinks = [];
                    $("a").each((_, element) => {
                        const href = $(element).attr("href");
                        const innerText = $(element).text();
                        if (href) {
                            associatedLinks.push(`${innerText !== null && innerText !== void 0 ? innerText : ""} - ${href}`);
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
            })));
            const fullData = pageData.concat(moreLinks);
            const allDocsWithMetadata = fullData.flat();
            const splitDocs = yield Promise.all(allDocsWithMetadata.map(data => splitter.splitDocuments([data])));
            const flattenedSplitDocs = splitDocs.flat();
            yield this.vector_store.addDocuments(flattenedSplitDocs);
        });
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
    getVectorStore() {
        return this.vector_store;
    }
}
exports.VectorStorageManager = VectorStorageManager;
