import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/mongo.js";
import { Movie } from "../models/Movie.js";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { seedUsers } from "./seed-data.js";
import { generateId } from "../utils/id.js";
import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const moviesJsonPath = path.resolve(repoRoot, "lumi_ai.movies.json");

const detectVideoType = (url = "") =>
  typeof url === "string" && url.toLowerCase().includes(".m3u8")
    ? "hls"
    : "mp4";

const loadMoviesFromJson = () => {
  if (!fs.existsSync(moviesJsonPath)) {
    throw new Error(
      `Không tìm thấy file dữ liệu phim tại ${moviesJsonPath}.` +
        " Vui lòng đảm bảo đã đặt lumi_ai.movies.json ở thư mục gốc dự án."
    );
  }
  const raw = JSON.parse(fs.readFileSync(moviesJsonPath, "utf-8"));
  if (!Array.isArray(raw)) {
    throw new Error("File dữ liệu phim phải là một mảng JSON.");
  }

  return raw.map((movie, index) => {
    const { _id, __v, createdAt, updatedAt, ...rest } = movie || {};
    const normalizedId = rest.id || rest.slug || generateId(`movie-${index}`);
    const slug = rest.slug || normalizedId;
    const tags = Array.isArray(rest.tags) ? rest.tags : [];
    const moods =
      Array.isArray(rest.moods) && rest.moods.length ? rest.moods : tags;
    const videoType = rest.videoType || detectVideoType(rest.videoUrl);
    const hasCustomHeaders =
      rest.videoHeaders && Object.keys(rest.videoHeaders).length > 0;

    return {
      ...rest,
      id: normalizedId,
      slug,
      tags,
      moods,
      videoType,
      videoHeaders:
        videoType === "hls"
          ? hasCustomHeaders
            ? rest.videoHeaders
            : getDefaultHlsHeaders()
          : rest.videoHeaders || {},
    };
  });
};

const runSeed = async () => {
  await connectDB();

  console.log("⏳ Đang seed dữ liệu...");

  const moviePayload = loadMoviesFromJson();

  const movieCount = await Movie.countDocuments();
  const userCount = await User.countDocuments();
  const reviewCount = await Review.countDocuments();

  await Movie.deleteMany({});
  await Review.deleteMany({});
  await Movie.insertMany(moviePayload);
  console.log(`✔ Đã import ${moviePayload.length} phim từ file JSON`);

  if (userCount === 0) {
    await User.insertMany(
      seedUsers.map((u) => ({
        ...u,
        password_hash: bcrypt.hashSync(u.password, 10),
      }))
    );
    console.log("✔ Seed User xong");
  }

  if (reviewCount === 0 && moviePayload.length >= 1) {
    const firstMovieId = moviePayload[0]?.id;
    const secondMovieId = moviePayload[1]?.id ?? firstMovieId;
    await Review.insertMany([
      {
        id: generateId("rv"),
        user_id: "demo-user",
        movie_id: firstMovieId,
        rating: 4.5,
        comment: "Căng thẳng, âm nhạc rất đỉnh!",
        sentiment: "positive",
      },
      {
        id: generateId("rv"),
        user_id: "demo-user",
        movie_id: secondMovieId,
        rating: 4.0,
        comment: "Nhẹ nhàng, chill cực.",
        sentiment: "positive",
      },
    ]);
    console.log("✔ Seed Review xong");
  }

  console.log("🎉 Seed dữ liệu hoàn tất!");
  process.exit(0);
};

runSeed();
