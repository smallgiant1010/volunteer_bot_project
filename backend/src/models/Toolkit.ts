import { DynamicStructuredTool } from "@langchain/core/tools";
import { VectorStorageManager } from "./VectorStorageManager";
import { createRetrieverTool } from "langchain/tools/retriever"
import z, { ZodAny } from "zod";

export class Toolkit {
    private tools: DynamicStructuredTool<any>[] = [];
    constructor(
        private vector_store_manager: VectorStorageManager
    ) {
        this.retrieverToolCreation();
        this.addingShiftToolCreation();
        this.cancelingShiftToolCreation();
        this.removingEventsToolCreation();
        this.retrieveFeedbackToolCreation();
        this.retrieveShiftsToolCreation();
        this.storeFeedbackToolCreation();
        this.storingEventsToolCreation();
    }

    getTools(): DynamicStructuredTool<any>[] {
        return this.tools;
    } 

    private retrieverToolCreation(): void {
        const retriever = this.vector_store_manager.getVectorStore().asRetriever({
            k: 2,
        });

        const retrieverTool = createRetrieverTool(retriever, {
            name: "events_retriever",
            description: "Use this tool to retrieve information about current volunteering events, including dates, descriptions, and locations.",
        });

        this.tools.push(retrieverTool);
    }

    private storingEventsToolCreation(): void {
        const schema = z.object({
            eventName: z.string().describe("The name of the new event"),
            eventDescription: z.string().describe("The description of the event and what it is about"),
            eventDate: z.string().describe("The date of the event"),
            secretCode: z.string().describe("The secret code provided by the user."),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "store_event",
            description: "Use this tool to store a new upcoming event",
            schema,
            func: async({ eventName, eventDescription, eventDate, secretCode }: { eventName: string, eventDescription: string, eventDate: string, secretCode: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const sanitizedCode = secretCode.trim();
                    await this.vector_store_manager.addEvent(eventDescription, cleanedQuery, eventDate, sanitizedCode);
                    return `${eventName} Successfully Added to the Database`
                }
                catch(error) {
                    return error;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private removingEventsToolCreation(): void {
        const schema = z.object({
            eventName: z.string().describe("Just the name of the event"),
            secretCode: z.string().describe("The secret code provided by the user."),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "event_cleanup",
            description: "Use this tool to cancel or remove an event.",
            schema,
            func: async({ eventName, secretCode } : { eventName: string, secretCode: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = await this.vector_store_manager.cleanupEvent(cleanedQuery, secretCode);
                    return result;
                } catch(error) {
                    return error;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private storeFeedbackToolCreation(): void {
        const schema = z.object({
            eventName: z.string().describe("Just the name of the event"),
            feedback: z.string().describe("The feedback about the event"),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "feedback_storing_tool",
            description: "Use this tool if the user leaves an opinion about a certain event so you can store the feedback.",
            schema,
            func: async({ eventName, feedback }: { eventName: string, feedback: string }) => {
                try {
                    const cleanedEventName = eventName.trim().toLowerCase();
                    const result = await this.vector_store_manager.storeFeedback(feedback, cleanedEventName);
                    return result;
                } catch(error) {
                    return error;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private retrieveFeedbackToolCreation(): void {
        const schema = z.object({
            eventName: z.string().describe("Just the name of the event"),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "feedback_retriever",
            description: "This tool is not for storing feedback. Use this tool in order to retrieve the feedback already stored regarding an event.",
            schema,
            func: async({ eventName }: { eventName: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const feedbacks = await this.vector_store_manager.getFeedback(cleanedQuery);
                    return feedbacks.join("\n") || `There were no feedbacks for ${eventName}.`;
                } catch(error) {
                    return error;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private addingShiftToolCreation(): void {
        const schema = z.object({
            fullName: z.string().describe("The full name of the individual trying to sign up for a shift"),
            eventName: z.string().describe("Just the name of the event"),
            shiftLetter: z.string().regex(/^[A-Z]$/i).describe("A single letter that represents the shift that the user is trying to sign up for"),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "add_shift",
            description: "Use this tool if the user is trying to sign up for an event",
            schema,
            func: async({ fullName, eventName, shiftLetter }: { fullName: string, eventName: string, shiftLetter: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = await this.vector_store_manager.addShift(fullName, cleanedQuery, shiftLetter);
                    return result;
                } catch(error) {
                    return `I received this error while trying to enroll ${fullName} on Shift ${shiftLetter} for ${eventName}: ${error}`;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private cancelingShiftToolCreation(): void {
        const schema = z.object({
            fullName: z.string().describe("The full name of the individual trying to sign up for a shift"),
            eventName: z.string().describe("Just the name of the event"),
            shiftLetter: z.string().regex(/^[A-Z]$/i).describe("A single letter that represents the shift that the user is trying to sign up for"),
            secretCode: z.string().describe("The secret code provided by the user."),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "cancel_shift",
            description: "Use this tool if the user is trying to cancel a shift for an event",
            schema,
            func: async({ fullName, eventName, shiftLetter, secretCode }: { fullName: string, eventName: string, shiftLetter: string, secretCode: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const result = await this.vector_store_manager.cancelShift(fullName, cleanedQuery, shiftLetter, secretCode);
                    return result;
                } catch(error) {
                    return error;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }

    private retrieveShiftsToolCreation(): void {
        const schema = z.object({
            eventName: z.string().describe("Just the name of the event"),
        }) as unknown as ZodAny;

        const tool = new DynamicStructuredTool({
            name: "get_volunteers_for_events",
            description: "Use this tool to retrieve all volunteers that have shifts for a specific event",
            schema,
            func: async({ eventName }: { eventName: string }) => {
                try {
                    const cleanedQuery = eventName.trim().toLowerCase();
                    const shifts = await this.vector_store_manager.eventShifts(cleanedQuery);
                    if (shifts.length === 0 || !shifts) {
                        return `No volunteers have signed up for ${eventName} yet.`;
                    }
                    const listOfShifts = shifts.map(shift => `${shift.name} has signed up for SHIFT ${shift.shiftLetter}`);
                    return listOfShifts.join("\n") || `I couldn't find any shifts for ${eventName}.`;
                } catch(error) {
                    return `I received this error while trying to retrieve the shifts for ${eventName}: ${error}`;
                }
            },
            returnDirect: true,
        });

        this.tools.push(tool);
    }
}