import express from "express";
import cors from "cors";
import morgan from "morgan";
import moviesRouter from "./routes/movies.js";
import authRouter from "./routes/auth.js";
import aiRouter from "./routes/ai.js";
import adminRouter from "./routes/admin.js";
import feedbackRouter from "./routes/feedback.js";

const app = express();
const PORT = process.env.PORT || 4000;

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
app.use("/api", feedbackRouter);

app.use((req, res) => {
  res.status(404).json({ message: `Không tìm thấy route ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`🚀 Lumi AI backend đang chạy tại http://localhost:${PORT}`);
});
