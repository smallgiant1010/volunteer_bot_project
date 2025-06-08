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
// import { OllamaEmbeddings } from "@langchain/ollama";
// import { MistralAIEmbeddings } from "@langchain/mistralai"
const google_genai_1 = require("@langchain/google-genai");
const mongodb_1 = require("@langchain/mongodb");
const mongodb_2 = require("mongodb");
const text_splitter_1 = require("langchain/text_splitter");
const Constants_1 = require("../constants/Constants");
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
dotenv.config();
class VectorStorageManager {
    constructor() {
        this.indexName = Constants_1.Indexes.DEV_INDEX;
        this.model = new google_genai_1.GoogleGenerativeAIEmbeddings({
            model: Constants_1.LLMS.DEV_EMBEDDING_MODEL,
        });
        this.client = new mongodb_2.MongoClient(process.env.MONGO_URI || "");
        const collection = this.client
            .db(process.env.MONGO_DB_NAME)
            .collection(Constants_1.Collections.EVENTS);
        this.events_vector_store = new mongodb_1.MongoDBAtlasVectorSearch(this.model, {
            collection,
            indexName: this.indexName,
            textKey: "text",
            embeddingKey: "embedding",
        });
    }
    addEvent(eventDescription, eventName, eventDate, secretCode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (secretCode !== process.env.SECRET_CODE) {
                return "You do not have the permissions to perform this action.";
            }
            const existing = yield this.events_vector_store.similaritySearch(eventDescription, 1, {
                preFilter: {
                    eventName: {
                        "$eq": eventName
                    },
                    eventDate: {
                        "$eq": eventDate
                    }
                }
            });
            if (existing.length > 0) {
                throw new Error(`Event "${eventName}" on ${eventDate} already exists.`);
            }
            const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
                chunkSize: 500,
                chunkOverlap: 20,
            });
            const chunkedText = yield splitter.splitText(eventDescription);
            const docs = [];
            const ids = [];
            for (let text of chunkedText) {
                docs.push({
                    pageContent: text,
                    metadata: { eventName, eventDate },
                });
                ids.push((0, uuid_1.v6)());
            }
            yield this.events_vector_store.addDocuments(docs, { ids });
            return `${eventName} was successfully registered into the database.`;
        });
    }
    cleanupEvent(eventName, secretCode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (secretCode !== process.env.SECRET_CODE) {
                return "You do not have the permissions to perform this action.";
            }
            const regex = new RegExp(eventName, "i");
            const eventsCollection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.EVENTS);
            const existingEventCount = yield eventsCollection.countDocuments({
                eventName: { $regex: regex },
            });
            if (existingEventCount === 0) {
                throw new Error(`No events found for "${eventName}". Cleanup skipped.`);
            }
            const eventDocs = yield eventsCollection
                .find({ eventName: { $regex: regex } })
                .toArray();
            const ids = eventDocs.map((event) => event._id.toString());
            yield this.events_vector_store.delete({ ids });
            const deleteResultFeedback = yield this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.FEEDBACK)
                .deleteMany({ eventName: { $regex: regex } });
            const deleteResultShifts = yield this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.SHIFTS)
                .deleteMany({ eventName: { $regex: regex } });
            return `${eventName} successfully removed from database, further more: \n${deleteResultFeedback.acknowledged ? `Feedback related to ${eventName} was removed as well.` : `Feedback for ${eventName} could not be removed`}\n${deleteResultShifts.acknowledged ? `Shifts related to ${eventName} were also removed.` : `The Shifts for this event could not be removed`}`;
        });
    }
    storeFeedback(feedback, eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.FEEDBACK);
            const result = yield collection.insertOne({
                feedback,
                eventName,
            });
            return result.acknowledged ? `Feedback for ${eventName} was accepted` : `Feedback for ${eventName} could not be stored`;
        });
    }
    getFeedback(eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.FEEDBACK);
            const feedback = (yield collection
                .find({ eventName: { $regex: new RegExp(eventName, "i") } })
                .toArray()).map((event) => event.feedback);
            if (!feedback || feedback.length === 0) {
                throw new Error(`There is no feedback for ${eventName} currently`);
            }
            return feedback;
        });
    }
    addShift(fullName, eventName, shiftLetter) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.SHIFTS);
            const existing = yield collection.findOne({
                fullName: { $regex: new RegExp(fullName, "i") },
                eventName: { $regex: new RegExp(eventName, "i") },
                shiftLetter: { $regex: new RegExp(shiftLetter, "i") },
            });
            if (existing) {
                throw new Error("A similar shift already exists.");
            }
            const result = yield collection.insertOne({
                fullName,
                eventName,
                shiftLetter,
            });
            return result.acknowledged ? `${fullName} has signed up for ${eventName} on SHIFT ${shiftLetter}` : `Something went wrong while signing up ${fullName} for ${eventName} on SHIFT ${shiftLetter}.\nPlease contact the director for this event.`;
        });
    }
    cancelShift(fullName, eventName, shiftLetter, secretCode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (secretCode !== process.env.SECRET_CODE) {
                return "You do not have the permissions to perform this action.";
            }
            const collection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.SHIFTS);
            const query = {
                fullName: { $regex: new RegExp(fullName, "i") },
                eventName: { $regex: new RegExp(eventName, "i") },
                shiftLetter: { $regex: new RegExp(shiftLetter, "i") },
            };
            const existingShift = yield collection.findOne(query);
            if (!existingShift) {
                throw new Error(`No matching shift found to cancel for ${fullName}.`);
            }
            const result = yield collection.findOneAndDelete(query);
            return `SHIFT ${shiftLetter} for ${fullName} was ${result !== null ? "successfully" : "NOT able to be"} canceled for the ${eventName}`;
        });
    }
    eventShifts(eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.client
                .db(process.env.MONGO_DB_NAME)
                .collection(Constants_1.Collections.SHIFTS);
            const shifts = (yield collection
                .find({ eventName: { $regex: new RegExp(eventName, "i") } })
                .toArray()).map((event) => {
                return {
                    name: event.fullName,
                    shiftLetter: event.shiftLetter,
                };
            });
            if (!shifts) {
                throw new Error(`Nobody signed up for ${eventName}`);
            }
            return shifts;
        });
    }
    getVectorStore() {
        return this.events_vector_store;
    }
    getClient() {
        return this.client;
    }
}
exports.VectorStorageManager = VectorStorageManager;
