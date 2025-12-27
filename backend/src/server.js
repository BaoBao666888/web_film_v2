// src/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import moviesRouter from "./routes/movies.js";
import authRouter from "./routes/auth.js";
import aiRouter from "./routes/ai.js";
import adminRouter from "./routes/admin.js";
import notificationsRouter from "./routes/notifications.js";
import feedbackRouter from "./routes/feedback.js";
import { connectDB } from "./config/mongo.js";
import historyRouter from "./routes/history.js";
import hlsRouter from "./routes/hls.js";
import watchPartyRouter from "./routes/watchParty.js";
import uploadRouter from "./routes/upload.js";
import { registerWatchPartySocket } from "./socket/watchParty.js";
import { startUnhideMoviesJob } from "./jobs/unhideMovies.js";
import { startCleanupTempUploadsJob } from "./jobs/cleanupTempUploads.js";
import { startUnlockUsersJob } from "./jobs/unlockUsers.js";
import { startAdminDailyTopupJob } from "./jobs/adminDailyTopup.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/movies", moviesRouter);
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api", feedbackRouter);
app.use("/api/history", historyRouter);
app.use("/api/hls", hlsRouter);
app.use("/api/watch-party", watchPartyRouter);
app.use("/api/upload", uploadRouter);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use((req, res) => {
  res.status(404).json({ message: `Không tìm thấy route ${req.path}` });
});

const start = async () => {
  await connectDB();
  registerWatchPartySocket(io);
  startUnhideMoviesJob();
  startCleanupTempUploadsJob();
  startUnlockUsersJob();
  startAdminDailyTopupJob();
  server.listen(PORT, () => {
    console.log(`Lumi AI backend đang chạy tại http://localhost:${PORT}`);
  });
};

start();
