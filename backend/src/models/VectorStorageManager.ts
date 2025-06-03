import { OllamaEmbeddings } from "@langchain/ollama";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { LLMS, Collections } from "../constants/Constants";
import * as dotenv from "dotenv";
import type { Document } from "@langchain/core/documents";
import { v6 as uuidv6 } from "uuid";

dotenv.config();

export class VectorStorageManager {
  private events_vector_store!: MongoDBAtlasVectorSearch;
  private indexName: string = "volunteerBot";
  private client!: MongoClient;
  private model: OllamaEmbeddings;

  constructor() {
    this.model = new OllamaEmbeddings({
      model: LLMS.EMBEDDING_MODEL as string,
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
    eventDate: string
  ) {
    const existing = await this.events_vector_store.similaritySearch(
      eventName,
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
  }

  async cleanupEvent(eventName: string): Promise<boolean> {
    const regex = new RegExp(eventName, "i");
    const eventsCollection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.EVENTS);

    const existingEventCount = await eventsCollection.countDocuments({
      eventName: { $regex: regex },
    });

    if (existingEventCount === 0) {
      console.warn(`No events found for "${eventName}". Cleanup skipped.`);
      return false;
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

    return deleteResultFeedback.acknowledged && deleteResultShifts.acknowledged;
  }

  async storeFeedback(feedback: string, eventName: string): Promise<boolean> {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.FEEDBACK);

    const result = await collection.insertOne({
      feedback,
      eventName,
    });

    return result.acknowledged;
  }

  async getFeedback(eventName: string) {
    const collection = this.client
      .db(process.env.MONGO_DB_NAME)
      .collection(Collections.FEEDBACK);

    const feedback = (
      await collection
        .find({ eventName: { $regex: new RegExp(eventName, "i") } })
        .toArray()
    ).map((event) => {
      return {
        feedback: event.feedback as string,
      };
    });

    if (!feedback) {
      throw new Error(`There is no feedback for ${eventName} currently`);
    }

    return feedback;
  }

  async addShift(
    fullName: string,
    eventName: string,
    shiftLetter: string
  ): Promise<boolean> {
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

    return result.acknowledged;
  }

  async cancelShift(
    fullName: string,
    eventName: string,
    shiftLetter: string
  ): Promise<boolean> {
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

    return result !== null; 
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
