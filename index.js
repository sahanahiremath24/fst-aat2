import "dotenv/config";
import { randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import session from "express-session";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import authRouter from "./routes/auth.js";
import expensesRouter from "./routes/expenses.js";

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

async function start() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure MongoDB.");
  }
  const sessionSecret = process.env.SESSION_SECRET || (
    process.env.NODE_ENV === "production" ? "" : randomBytes(48).toString("base64")
  );
  if (sessionSecret.length < 32) {
    throw new Error("Set SESSION_SECRET in .env to a random string of at least 32 characters.");
  }
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is unset; using a temporary development secret. Set one in .env to preserve sessions across restarts.");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");
  app.use(session({
    name: "spendwise.sid",
    secret: sessionSecret,
    store: MongoStore.create({ mongoUrl: mongoUri, collectionName: "sessions" }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));
  app.use("/api/auth", authRouter);
  app.use("/api/expenses", expensesRouter);
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: "An unexpected server error occurred." });
  });
  app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
}

start().catch((error) => {
  console.error("Could not start the API server:", error.message);
  process.exitCode = 1;
});
