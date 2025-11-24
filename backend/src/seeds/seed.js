import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/mongo.js";
import { Movie } from "../models/Movie.js";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { seedMovies, seedUsers } from "./seed-data.js";
import { generateId } from "../utils/id.js";

dotenv.config();

const runSeed = async () => {
  await connectDB();

  console.log("⏳ Đang seed dữ liệu...");

  const movieCount = await Movie.countDocuments();
  const userCount = await User.countDocuments();
  const reviewCount = await Review.countDocuments();

  if (movieCount === 0) {
    await Movie.insertMany(seedMovies);
    console.log("✔ Seed Movie xong");
  }

  if (userCount === 0) {
    await User.insertMany(
      seedUsers.map((u) => ({
        ...u,
        password_hash: bcrypt.hashSync(u.password, 10),
      }))
    );
    console.log("✔ Seed User xong");
  }

  if (reviewCount === 0) {
    await Review.insertMany([
      {
        id: generateId("rv"),
        user_id: "demo-user",
        movie_id: "nightfall-echoes",
        rating: 4.5,
        comment: "Căng thẳng, âm nhạc rất đỉnh!",
        sentiment: "positive",
      },
      {
        id: generateId("rv"),
        user_id: "demo-user",
        movie_id: "echoes-of-sakura",
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
