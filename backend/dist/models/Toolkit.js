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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolkit = void 0;
const tools_1 = require("@langchain/core/tools");
const retriever_1 = require("langchain/tools/retriever");
const zod_1 = __importDefault(require("zod"));
class Toolkit {
    constructor(vector_store_manager) {
        this.vector_store_manager = vector_store_manager;
        this.tools = [];
        this.retrieverToolCreation();
        this.addingShiftToolCreation();
        this.cancelingShiftToolCreation();
        this.removingEventsToolCreation();
        this.retrieveFeedbackToolCreation();
        this.retrieveShiftsToolCreation();
        this.storeFeedbackToolCreation();
        this.storingEventsToolCreation();
    }
    getTools() {
        return this.tools;
    }
    retrieverToolCreation() {
        const retriever = this.vector_store_manager.getVectorStore().asRetriever({
            k: 2,
        });
        const retrieverTool = (0, retriever_1.createRetrieverTool)(retriever, {
            name: "events_retriever",
            description: "Use this tool to retrieve information about current volunteering events, including dates, descriptions, and locations.",
        });
        this.tools.push(retrieverTool);
    }
    storingEventsToolCreation() {
        const schema = zod_1.default.object({
            eventName: zod_1.default.string().describe("The name of the new event"),
            eventDescription: zod_1.default.string().describe("The description of the event and what it is about"),
            eventDate: zod_1.default.string().describe("The date of the event"),
            secretCode: zod_1.default.string().describe("The secret code provided by the user."),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "store_event",
            description: "Use this tool to store a new upcoming event",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ eventName, eventDescription, eventDate, secretCode }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const sanitizedCode = secretCode.trim();
                    yield this.vector_store_manager.addEvent(eventDescription, cleanedQuery, eventDate, sanitizedCode);
                    return `${eventName} Successfully Added to the Database`;
                }
                catch (error) {
                    return error;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    removingEventsToolCreation() {
        const schema = zod_1.default.object({
            eventName: zod_1.default.string().describe("Just the name of the event"),
            secretCode: zod_1.default.string().describe("The secret code provided by the user."),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "event_cleanup",
            description: "Use this tool to cancel or remove an event.",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ eventName, secretCode }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = yield this.vector_store_manager.cleanupEvent(cleanedQuery, secretCode);
                    return result;
                }
                catch (error) {
                    return error;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    storeFeedbackToolCreation() {
        const schema = zod_1.default.object({
            eventName: zod_1.default.string().describe("Just the name of the event"),
            feedback: zod_1.default.string().describe("The feedback about the event"),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "feedback_storing_tool",
            description: "Use this tool if the user leaves an opinion about a certain event so you can store the feedback.",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ eventName, feedback }) {
                try {
                    const cleanedEventName = eventName.trim().toLowerCase();
                    const result = yield this.vector_store_manager.storeFeedback(feedback, cleanedEventName);
                    return result;
                }
                catch (error) {
                    return error;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    retrieveFeedbackToolCreation() {
        const schema = zod_1.default.object({
            eventName: zod_1.default.string().describe("Just the name of the event"),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "feedback_retriever",
            description: "This tool is not for storing feedback. Use this tool in order to retrieve the feedback already stored regarding an event.",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ eventName }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const feedbacks = yield this.vector_store_manager.getFeedback(cleanedQuery);
                    return feedbacks.join("\n") || `There were no feedbacks for ${eventName}.`;
                }
                catch (error) {
                    return error;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    addingShiftToolCreation() {
        const schema = zod_1.default.object({
            fullName: zod_1.default.string().describe("The full name of the individual trying to sign up for a shift"),
            eventName: zod_1.default.string().describe("Just the name of the event"),
            shiftLetter: zod_1.default.string().regex(/^[A-Z]$/i).describe("A single letter that represents the shift that the user is trying to sign up for"),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "add_shift",
            description: "Use this tool if the user is trying to sign up for an event",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ fullName, eventName, shiftLetter }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = yield this.vector_store_manager.addShift(fullName, cleanedQuery, shiftLetter);
                    return result;
                }
                catch (error) {
                    return `I received this error while trying to enroll ${fullName} on Shift ${shiftLetter} for ${eventName}: ${error}`;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    cancelingShiftToolCreation() {
        const schema = zod_1.default.object({
            fullName: zod_1.default.string().describe("The full name of the individual trying to sign up for a shift"),
            eventName: zod_1.default.string().describe("Just the name of the event"),
            shiftLetter: zod_1.default.string().regex(/^[A-Z]$/i).describe("A single letter that represents the shift that the user is trying to sign up for"),
            secretCode: zod_1.default.string().describe("The secret code provided by the user."),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "cancel_shift",
            description: "Use this tool if the user is trying to cancel a shift for an event",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ fullName, eventName, shiftLetter, secretCode }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = yield this.vector_store_manager.cancelShift(fullName, cleanedQuery, shiftLetter, secretCode);
                    return result;
                }
                catch (error) {
                    return error;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
    retrieveShiftsToolCreation() {
        const schema = zod_1.default.object({
            eventName: zod_1.default.string().describe("Just the name of the event"),
        });
        const tool = new tools_1.DynamicStructuredTool({
            name: "get_volunteers_for_events",
            description: "Use this tool to retrieve all volunteers that have shifts for a specific event",
            schema,
            func: (_a) => __awaiter(this, [_a], void 0, function* ({ eventName }) {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const shifts = yield this.vector_store_manager.eventShifts(cleanedQuery);
                    if (shifts.length === 0 || !shifts) {
                        return `No volunteers have signed up for ${eventName} yet.`;
                    }
                    const listOfShifts = shifts.map(shift => `${shift.name} has signed up for SHIFT ${shift.shiftLetter}`);
                    return listOfShifts.join("\n") || `I couldn't find any shifts for ${eventName}.`;
                }
                catch (error) {
                    return `I received this error while trying to retrieve the shifts for ${eventName}: ${error}`;
                }
            }),
            returnDirect: true,
        });
        this.tools.push(tool);
    }
}
exports.Toolkit = Toolkit;
