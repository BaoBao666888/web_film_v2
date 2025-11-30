import { Router } from "express";
import fetch from "node-fetch";
import { pipeline } from "node:stream/promises";
import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

const router = Router();

const DEFAULT_HEADERS = getDefaultHlsHeaders();
const DEFAULT_REFERER = DEFAULT_HEADERS.Referer;

// ==== Cache đoạn HLS để giảm tải nguồn phim ====
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
const CACHE_MAX_ITEMS = 500;
const CACHE_MAX_BYTES = 80 * 1024 * 1024; // 80 MB
const segmentCache = new Map(); // key -> { buffer, contentType, storedAt, size }
let cacheSize = 0;

export const clearHlsCache = () => {
  segmentCache.clear();
  cacheSize = 0;
};

function safeOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return "https://rophim.net";
  }
}

const isSegment = (url, contentType) => {
  const lower = url.toLowerCase();
  return (
    lower.includes(".ts") ||
    lower.includes(".m4s") ||
    lower.includes(".mp4") ||
    lower.includes(".aac") ||
    lower.includes(".mp3") ||
    (contentType && contentType.includes("video")) ||
    (contentType && contentType.includes("audio"))
  );
};

const evictCacheIfNeeded = () => {
  const now = Date.now();
  for (const [key, value] of segmentCache) {
    if (now - value.storedAt > CACHE_TTL_MS) {
      cacheSize -= value.size;
      segmentCache.delete(key);
    }
  }
  while (segmentCache.size > CACHE_MAX_ITEMS || cacheSize > CACHE_MAX_BYTES) {
    const oldestKey = segmentCache.keys().next().value;
    if (!oldestKey) break;
    cacheSize -= segmentCache.get(oldestKey).size;
    segmentCache.delete(oldestKey);
  }
};

const getCache = (key) => {
  const item = segmentCache.get(key);
  if (!item) return null;
  if (Date.now() - item.storedAt > CACHE_TTL_MS) {
    cacheSize -= item.size;
    segmentCache.delete(key);
    return null;
  }
  segmentCache.delete(key);
  segmentCache.set(key, item);
  return item;
};

const setCache = (key, buffer, contentType) => {
  const size = buffer?.byteLength ?? 0;
  segmentCache.set(key, {
    buffer,
    contentType,
    storedAt: Date.now(),
    size,
  });
  cacheSize += size;
  evictCacheIfNeeded();
};

const parseHeaders = (value) => {
  if (!value && value !== "") return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return value ? JSON.parse(value) : {};
    } catch (error) {
      console.warn("Invalid header JSON supplied:", error.message);
      return {};
    }
  }
  return {};
};

const mergeHeaders = (customHeaders = {}) => {
  const merged = {
    ...DEFAULT_HEADERS,
    ...Object.fromEntries(
      Object.entries(customHeaders).map(([key, val]) => [key, String(val)])
    ),
  };
  if (!merged.Origin) {
    merged.Origin = safeOrigin(merged.Referer || DEFAULT_REFERER);
  }
  return merged;
};

const normalizeUrl = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    return decodeURIComponent(rawUrl);
  } catch {
    return rawUrl;
  }
};

const ensureAbsolute = (candidate, base) => {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return candidate;
  }
};

const parseMasterPlaylist = (playlist, baseUrl) => {
  const lines = playlist.split(/\r?\n/).map((line) => line.trim());
  const qualities = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("#EXT-X-STREAM-INF")) {
      let nextLineIndex = index + 1;
      while (nextLineIndex < lines.length) {
        const maybeUrl = lines[nextLineIndex];
        if (maybeUrl && !maybeUrl.startsWith("#")) {
          const streamUrl = ensureAbsolute(maybeUrl, baseUrl);
          qualities.push({
            url: streamUrl,
            resolution: extractResolution(line),
            bitrate: extractBitrate(line),
          });
          break;
        }
        nextLineIndex += 1;
      }
    }
  }
  return qualities.sort(
    (a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0)
  );
};

const extractResolution = (infoLine) => {
  const match = infoLine.match(/RESOLUTION=(\d+x\d+)/i);
  return match ? match[1] : undefined;
};

const extractBitrate = (infoLine) => {
  const match = infoLine.match(/BANDWIDTH=(\d+)/i);
  if (!match) return undefined;
  const bandwidth = Number(match[1]);
  if (Number.isNaN(bandwidth)) return undefined;
  return Number((bandwidth / 1_000_000).toFixed(2));
};

const isPlaylistContent = (contentType, url) => {
  return (
    (contentType && contentType.includes("mpegurl")) ||
    (url && url.toLowerCase().includes(".m3u8"))
  );
};

const rewritePlaylist = (playlist, baseUrl, headersPayload) => {
  const encodedHeaders = encodeURIComponent(JSON.stringify(headersPayload));
  return playlist
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const segmentUrl = ensureAbsolute(trimmed, baseUrl);
        const encodedSegment = encodeURIComponent(segmentUrl);
        return `/api/hls/proxy?url=${encodedSegment}&headers=${encodedHeaders}`;
      }
      return line;
    })
    .join("\n");
};

router.post("/analyze", async (req, res) => {
  const { url, headers } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Thiếu URL nguồn phát." });
  }
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ message: "URL không hợp lệ." });
  }

  const headerPayload = parseHeaders(headers);
  try {
    const upstream = await fetch(url, { headers: mergeHeaders(headerPayload) });
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ message: "Không thể tải playlist từ nguồn." });
    }
    const playlistText = await upstream.text();
    const finalUrl = upstream.url || url;
    const qualities = parseMasterPlaylist(playlistText, finalUrl);
    const encodedHeaders = encodeURIComponent(
      JSON.stringify(headerPayload || {})
    );

    if (qualities.length > 0) {
      return res.json({
        type: "master",
        qualities: qualities.map((quality, index) => ({
          id: `${quality.resolution ?? "auto"}-${index}`,
          resolution: quality.resolution,
          bitrate: quality.bitrate,
          proxiedUrl: `/api/hls/proxy?url=${encodeURIComponent(
            quality.url
          )}&headers=${encodedHeaders}`,
          url: quality.url,
        })),
      });
    }

    return res.json({
      type: "direct",
      proxiedUrl: `/api/hls/proxy?url=${encodeURIComponent(
        finalUrl
      )}&headers=${encodedHeaders}`,
      url: finalUrl,
    });
  } catch (error) {
    console.error("HLS analyze error:", error);
    return res
      .status(500)
      .json({ message: "Không thể phân tích nguồn HLS lúc này." });
  }
});

router.get("/proxy", async (req, res) => {
  const target = normalizeUrl(req.query.url);
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).send("Thiếu hoặc sai URL.");
  }

  const headerPayload = parseHeaders(normalizeUrl(req.query.headers) ?? "{}");
  const cacheKey = `${target}::${req.query.headers || ""}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.setHeader("Content-Type", cached.contentType || "application/octet-stream");
    return res.send(Buffer.from(cached.buffer));
  }

  try {
    const upstream = await fetch(target, {
      headers: mergeHeaders(headerPayload),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return res.status(upstream.status).send(
        text || "Không thể truy cập nguồn HLS."
      );
    }

    const finalUrl = upstream.url || target;
    const contentType =
      upstream.headers.get("content-type") ||
      (finalUrl.includes(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "application/octet-stream");

    if (isPlaylistContent(contentType, finalUrl)) {
      const playlistText = await upstream.text();
      const rewritten = rewritePlaylist(playlistText, finalUrl, headerPayload);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(rewritten);
    }

    if (upstream.headers.has("content-length")) {
      res.setHeader(
        "Content-Length",
        upstream.headers.get("content-length")
      );
    }
    res.setHeader("Content-Type", contentType);
    // cache segment/binary, stream playlists
    if (isSegment(finalUrl, contentType)) {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      setCache(cacheKey, buffer, contentType);
      return res.send(buffer);
    }
    try {
      await pipeline(upstream.body, res);
    } catch (streamErr) {
      console.error("HLS proxy stream error:", streamErr);
      if (!res.headersSent) {
        return res.status(502).send("Upstream stream closed unexpectedly.");
      }
      res.end();
      return;
    }
  } catch (error) {
    console.error("HLS proxy error:", error);
    if (!res.headersSent) {
      res.status(500).send("Lỗi proxy HLS.");
    }
  }
});

export default router;
