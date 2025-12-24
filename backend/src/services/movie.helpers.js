import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

/**
 * Movie utilities and helpers
 */

export const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const orDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

export const SERIES_STATUS_VALUES = ["Còn tiếp", "Hoàn thành", "Tạm ngưng"];

export const sanitizeTags = (tags = []) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const cleaned = [];

  for (const raw of tags) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    if (SERIES_STATUS_VALUES.includes(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }

  return cleaned;
};

export const parseHeadersPayload = (value, fallback = {}) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Không thể parse videoHeaders:", error.message);
      return fallback;
    }
  }
  return fallback;
};

export const detectVideoType = (explicitType, url) => {
  if (explicitType === "hls" || explicitType === "mp4") {
    return explicitType;
  }
  if (typeof url === "string" && url.toLowerCase().includes(".m3u8")) {
    return "hls";
  }
  return "mp4";
};

export const resolveVideoHeaders = (videoType, headersValue) => {
  const parsed = parseHeadersPayload(headersValue, {});
  const sanitized = parsed && typeof parsed === "object" ? parsed : {};
  const hasCustomHeaders = Object.keys(sanitized).length > 0;
  if (videoType === "hls") {
    return hasCustomHeaders ? sanitized : getDefaultHlsHeaders();
  }
  return sanitized;
};

export const sanitizeEpisodes = (episodes = [], fallbackHeaders = {}) => {
  if (!Array.isArray(episodes)) return [];
  return episodes
    .map((episode, index) => {
      const number = Number(episode.number ?? index + 1);
      const videoUrl = episode.videoUrl || "";
      if (!videoUrl) return null;
      const videoType = detectVideoType(episode.videoType, videoUrl);
      return {
        number,
        title: episode.title || `Tập ${number}`,
        videoUrl,
        videoType,
        videoHeaders: resolveVideoHeaders(
          videoType,
          episode.videoHeaders ?? fallbackHeaders
        ),
        duration: episode.duration || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
};
