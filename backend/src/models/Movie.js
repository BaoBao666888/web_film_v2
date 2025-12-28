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
        status: {
          type: String,
          enum: ["public", "hidden", "premiere"],
          default: "public",
        },
        premiereAt: {
          type: Date,
          default: null,
        },
        previewEnabled: {
          type: Boolean,
          default: false,
        },
        previewPrice: {
          type: Number,
          default: 0,
        },
        releasedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    tags: [String],
    moods: [String],
    cast: [String],
    director: String,
    country: String,
    seriesStatus: String,
    embedding_synced: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    unhideDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["public", "hidden", "premiere"],
      default: "public",
      index: true,
    },
    premiereAt: {
      type: Date,
      default: null,
    },
    previewEnabled: {
      type: Boolean,
      default: false,
    },
    previewPrice: {
      type: Number,
      default: 0,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Movie = mongoose.model("Movie", MovieSchema);
