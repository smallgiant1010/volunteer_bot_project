"use strict";
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
exports.ToolKit = void 0;
const tools_1 = require("@langchain/core/tools");
const retriever_1 = require("langchain/tools/retriever");
const zod_1 = require("zod");
const Links_1 = require("./constants/Links");
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const cheerio_2 = require("cheerio");
class ToolKit {
    constructor(vector_store) {
        this.tools = [];
        this.addRetrieverTool(vector_store);
        this.addLinkTool();
    }
    addRetrieverTool(vector_store) {
        const retriever = vector_store.asRetriever({
            k: 10,
        });
        const retrieverTool = (0, retriever_1.createRetrieverTool)(retriever, {
            name: "website_information",
            description: "Use this tool to answer factual questions about Bridges To Science. This tool does not return URLs or links, only information.",
        });
        this.tools.push(retrieverTool);
    }
    addLinkTool() {
        const linkTool = new tools_1.DynamicStructuredTool({
            name: "Find Relevant Links",
            description: "Use this tool only if the user explicitly asks for URLs or Links.",
            schema: zod_1.z.object({
                query: zod_1.z.string().describe("The user's query or question."),
            }),
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ query }) {
                var _b;
                const cleanQuery = query.toLowerCase().trim();
                const allLinks = yield this.deepSearchLinks();
                const scored = allLinks.map(link => (Object.assign(Object.assign({}, link), { score: link.label.toLowerCase().includes(cleanQuery) ? 1 : 0 })));
                const bestMatched = scored.sort((a, b) => b.score - a.score)[0];
                return (_b = bestMatched.url) !== null && _b !== void 0 ? _b : "I could not find a relevant link that matches your case";
            })
        });
        this.tools.push(linkTool);
    }
    deepSearchLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            const linkSet = [];
            const seenUrls = new Set();
            for (let link of Links_1.relevant_links) {
                seenUrls.add(link.url);
            }
            yield Promise.all(Links_1.relevant_links.map((link) => __awaiter(this, void 0, void 0, function* () {
                const loader = new cheerio_1.CheerioWebBaseLoader(link.url);
                const docs = yield loader.load();
                if (!docs[0].pageContent)
                    return;
                const $ = (0, cheerio_2.load)(docs[0].pageContent);
                $("a").each((_, el) => {
                    const href = $(el).attr("href");
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
            })));
            return linkSet.concat(Links_1.relevant_links);
        });
    }
    getTools() {
        return this.tools;
    }
}
exports.ToolKit = ToolKit;
