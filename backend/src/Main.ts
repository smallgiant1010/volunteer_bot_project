import express from "express";
import * as dotenv from "dotenv";
import morgan from "morgan";
import router from "./routes/Router";
import establishSessionCookies from "./middleware/sessionMiddleware";
import cookieParser from "cookie-parser";
import cors from "cors";
// import "./types";

dotenv.config();

// create app
const app = express();

// middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(cookieParser());
app.use(establishSessionCookies);

// routes
app.use("/api/v1", router);

// port
app.listen(process.env.PORT, () => {
    console.log("App Is Running On Port " + process.env.PORT);
});


