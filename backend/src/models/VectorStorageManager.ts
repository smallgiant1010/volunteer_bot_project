// import { OllamaEmbeddings } from "@langchain/ollama";
// import { MistralAIEmbeddings } from "@langchain/mistralai"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { LLMS, Collections, Indexes } from "../constants/Constants";
import * as dotenv from "dotenv";
import type { Document } from "@langchain/core/documents";
import { v6 as uuidv6 } from "uuid";

dotenv.config();

export class VectorStorageManager {
  private events_vector_store!: MongoDBAtlasVectorSearch;
  private indexName: string = Indexes.DEV_INDEX;
  private client!: MongoClient;
  private model: GoogleGenerativeAIEmbeddings;

  constructor() {
    this.model = new GoogleGenerativeAIEmbeddings({
      model: LLMS.DEV_EMBEDDING_MODEL as string,
    });

    this.client = new MongoClient(process.env.MONGO_URI || "");
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.EVENTS);

    this.events_vector_store = new MongoDBAtlasVectorSearch(this.model, {
      collection,
      indexName: this.indexName,
      textKey: "text",
      embeddingKey: "embedding",
    });
  }

  async addEvent(
    eventDescription: string,
    eventName: string,
    eventDate: string,
    secretCode: string,
  ) {
    if(secretCode !== process.env.SECRET_CODE) {
      return "You do not have the permissions to perform this action.";
    }
    const existing = await this.events_vector_store.similaritySearch(
      eventDescription,
      1,
      {
        preFilter: {
          eventName: {
            "$eq": eventName
          },
          eventDate: {
            "$eq": eventDate
          }
        }
      }
    );

    if (existing.length > 0) {
      throw new Error(`Event "${eventName}" on ${eventDate} already exists.`);
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 20,
    });

    const chunkedText = await splitter.splitText(eventDescription);

    const docs: Document[] = [];
    const ids: string[] = [];

    for (let text of chunkedText) {
      docs.push({
        pageContent: text,
        metadata: { eventName, eventDate },
      });
      ids.push(uuidv6());
    }

    await this.events_vector_store.addDocuments(docs, { ids });
    return `${eventName} was successfully registered into the database.`;
  }

  async cleanupEvent(eventName: string, secretCode: string) {
    if(secretCode !== process.env.SECRET_CODE) {
      return "You do not have the permissions to perform this action.";
    }
    const regex = new RegExp(eventName, "i");
    const eventsCollection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.EVENTS);

    const existingEventCount = await eventsCollection.countDocuments({
      eventName: { $regex: regex },
    });

    if (existingEventCount === 0) {
      throw new Error(`No events found for "${eventName}". Cleanup skipped.`);
    }

    const eventDocs = await eventsCollection
      .find({ eventName: { $regex: regex } })
      .toArray();
    const ids: string[] = eventDocs.map((event) => event._id.toString());

    await this.events_vector_store.delete({ ids });

    const deleteResultFeedback = await this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.FEEDBACK)
      .deleteMany({ eventName: { $regex: regex } });

    const deleteResultShifts = await this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.SHIFTS)
      .deleteMany({ eventName: { $regex: regex } });

    return `${eventName} successfully removed from database, further more: \n${deleteResultFeedback.acknowledged ? `Feedback related to ${eventName} was removed as well.`: `Feedback for ${eventName} could not be removed`}\n${deleteResultShifts.acknowledged ? `Shifts related to ${eventName} were also removed.` : `The Shifts for this event could not be removed`}`;
  }

  async storeFeedback(feedback: string, eventName: string) {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.FEEDBACK);

    const result = await collection.insertOne({
      feedback,
      eventName,
    });

    return result.acknowledged ? `Feedback for ${eventName} was accepted` : `Feedback for ${eventName} could not be stored`;
  }

  async getFeedback(eventName: string) {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.FEEDBACK);

    const feedback = (
      await collection
        .find({ eventName: { $regex: new RegExp(eventName, "i") } })
        .toArray()
    ).map((event) => event.feedback as string);

    if (!feedback || feedback.length === 0) {
      throw new Error(`There is no feedback for ${eventName} currently`);
    }

    return feedback;
  }

  async addShift(
    fullName: string,
    eventName: string,
    shiftLetter: string
  ) {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.SHIFTS);

    const existing = await collection.findOne({
      fullName: { $regex: new RegExp(fullName, "i") },
      eventName: { $regex: new RegExp(eventName, "i") },
      shiftLetter: { $regex: new RegExp(shiftLetter, "i") },
    });

    if (existing) {
      throw new Error("A similar shift already exists.");
    }

    const result = await collection.insertOne({
      fullName,
      eventName,
      shiftLetter,
    });

    return result.acknowledged ? `${fullName} has signed up for ${eventName} on SHIFT ${shiftLetter}` : `Something went wrong while signing up ${fullName} for ${eventName} on SHIFT ${shiftLetter}.\nPlease contact the director for this event.`;
  }

  async cancelShift(
    fullName: string,
    eventName: string,
    shiftLetter: string,
    secretCode: string,
  ) {
    if(secretCode !== process.env.SECRET_CODE) {
      return "You do not have the permissions to perform this action.";
    }

    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.SHIFTS);

    const query = {
      fullName: { $regex: new RegExp(fullName, "i") },
      eventName: { $regex: new RegExp(eventName, "i") },
      shiftLetter: { $regex: new RegExp(shiftLetter, "i") },
    };

    const existingShift = await collection.findOne(query);

    if (!existingShift) {
      throw new Error(`No matching shift found to cancel for ${fullName}.`);
    }

    const result = await collection.findOneAndDelete(query);

    return `SHIFT ${shiftLetter} for ${fullName} was ${result !== null ? "successfully" : "NOT able to be"} canceled for the ${eventName}`; 
  }

  async eventShifts(eventName: string): Promise<
    {
      name: string;
      shiftLetter: string;
    }[]
  > {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.SHIFTS);

    const shifts = (
      await collection
        .find({ eventName: { $regex: new RegExp(eventName, "i") } })
        .toArray()
    ).map((event) => {
      return {
        name: event.fullName as string,
        shiftLetter: event.shiftLetter as string,
      };
    });

    if(!shifts) {
        throw new Error(`Nobody signed up for ${eventName}`);
    }

    return shifts;
  }

  getVectorStore(): MongoDBAtlasVectorSearch {
    return this.events_vector_store;
  }

  getClient(): MongoClient {
    return this.client;
  }
}
