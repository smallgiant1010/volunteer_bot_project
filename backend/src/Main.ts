import express from "express";
import * as dotenv from "dotenv";
import morgan from "morgan";
import router from "./routes/Router";
import establishSessionCookies from "./middleware/sessionMiddleware";
import cookieParser from "cookie-parser";
// import "./types";

dotenv.config();

// create app
const app = express();

// middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(establishSessionCookies);

// routes
app.use("/api/v1", router);

// port
app.listen(4000, () => {
    console.log("App Is Running On Port 4000");
});


