import express from "express";
import * as dotenv from "dotenv";
import morgan from "morgan";
import router from "./routes/Router";
import cookieMiddleware from "./middleware/sessionMiddleware";

dotenv.config();

// create app
const app = express();

// middleware
app.use(morgan('dev'));
app.use(express.json());

// routes
app.use("/api/v1", cookieMiddleware, router);

