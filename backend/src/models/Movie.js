import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    slug: { type: String, unique: true, index: true },
    title: String,
    type: {
      type: String,
      enum: ["single", "series"],
      default: "single",
    },
    synopsis: String,
    year: Number,
    duration: String,
    rating: Number,
    thumbnail: String,
    poster: String,
    trailerUrl: String,
    videoUrl: String,
    videoType: {
      type: String,
      enum: ["mp4", "hls"],
      default: "mp4",
    },
    videoHeaders: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    episodes: [
      {
        number: Number,
        title: String,
        videoUrl: String,
        videoType: {
          type: String,
          enum: ["mp4", "hls"],
          default: "mp4",
        },
        videoHeaders: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        duration: String,
      },
    ],
    tags: [String],
    moods: [String],
    cast: [String],
    director: String,
  },
  { timestamps: true }
);

export const Movie = mongoose.model("Movie", MovieSchema);
