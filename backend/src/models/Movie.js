import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    slug: { type: String, unique: true, index: true },
    title: String,
    synopsis: String,
    year: Number,
    duration: String,
    rating: Number,
    thumbnail: String,
    poster: String,
    trailerUrl: String,
    videoUrl: String,
    tags: [String],
    moods: [String],
    cast: [String],
    director: String,
  },
  { timestamps: true }
);

export const Movie = mongoose.model("Movie", MovieSchema);
