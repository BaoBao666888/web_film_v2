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
export const MOVIE_STATUS_VALUES = ["public", "hidden", "premiere"];

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
      const status = MOVIE_STATUS_VALUES.includes(episode.status)
        ? episode.status
        : "public";
      const premiereAt = episode.premiereAt ? new Date(episode.premiereAt) : null;
      const previewEnabled = Boolean(episode.previewEnabled);
      const previewPrice = Number(episode.previewPrice) || 0;
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
        status,
        premiereAt: premiereAt && !Number.isNaN(premiereAt.getTime()) ? premiereAt : null,
        previewEnabled,
        previewPrice,
        releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
};

export const parseDurationToSeconds = (value) => {
  if (!value) return 0;
  const raw = String(value).toLowerCase();
  const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = raw.match(/(\d+(?:\.\d+)?)\s*m/);
  let minutes = 0;

  if (hoursMatch) {
    minutes += Number(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    minutes += Number(minutesMatch[1]);
  }

  if (!hoursMatch && !minutesMatch) {
    const numeric = Number(raw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(numeric)) {
      minutes += numeric;
    }
  }

  return Math.max(0, Math.round(minutes * 60));
};
