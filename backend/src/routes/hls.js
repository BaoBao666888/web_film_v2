import { Router } from "express";
import fetch from "node-fetch";
import { PassThrough } from "node:stream";
import { pipeline, finished } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

const router = Router();

const DEFAULT_HEADERS = getDefaultHlsHeaders();
const DEFAULT_REFERER = DEFAULT_HEADERS.Referer;

// ==== Cache đoạn HLS lên đĩa để giảm tải nguồn phim ====
const CACHE_ROOT = path.resolve(process.cwd(), "hls-cache");
const SHARED_ROOM = "shared";

const getRoomDir = (roomId) =>
  path.join(CACHE_ROOT, roomId ? `room-${roomId}` : SHARED_ROOM);

const hashKey = (key) =>
  crypto.createHash("sha1").update(String(key)).digest("hex");

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const getCachePaths = (roomId, key) => {
  const dir = getRoomDir(roomId);
  const hash = hashKey(key);
  return {
    dir,
    dataPath: path.join(dir, hash),
    metaPath: path.join(dir, `${hash}.json`),
  };
};

const getDiskCache = async (roomId, key) => {
  const { dataPath, metaPath } = getCachePaths(roomId, key);
  try {
    const [metaRaw, stat] = await Promise.all([
      fs.readFile(metaPath, "utf-8"),
      fs.stat(dataPath),
    ]);
    const meta = JSON.parse(metaRaw || "{}");
    return {
      dataPath,
      contentType: meta.contentType,
      size: stat.size,
    };
  } catch {
    return null;
  }
};

const setDiskCache = async (roomId, key, buffer, contentType) => {
  const { dir, dataPath, metaPath } = getCachePaths(roomId, key);
  await ensureDir(dir);
  await fs.writeFile(dataPath, buffer);
  await fs.writeFile(
    metaPath,
    JSON.stringify({ contentType, storedAt: Date.now() })
  );
};

export const clearHlsCache = async (roomId) => {
  const dir = roomId ? getRoomDir(roomId) : CACHE_ROOT;
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

const streamSegmentToCache = async ({
  roomId,
  cacheKey,
  upstream,
  res,
  contentType,
}) => {
  const { dir, dataPath, metaPath } = getCachePaths(roomId, cacheKey);
  await ensureDir(dir);
  const tempPath = `${dataPath}.part-${Date.now()}`;
  const fileStream = createWriteStream(tempPath);
  const tee = new PassThrough();

  upstream.body.on("error", (err) => {
    tee.destroy(err);
  });

  tee.on("error", (err) => {
    fileStream.destroy(err);
    res.destroy(err);
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      fileStream.destroy();
    }
  });

  upstream.body.pipe(tee);
  tee.pipe(res);
  tee.pipe(fileStream);

  try {
    await Promise.all([finished(res), finished(fileStream)]);
    await fs.rename(tempPath, dataPath);
    await fs.writeFile(
      metaPath,
      JSON.stringify({ contentType, storedAt: Date.now() })
    );
  } catch (err) {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // ignore
    }
    throw err;
  }
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

const rewritePlaylist = (playlist, baseUrl, headersPayload, roomId) => {
  const encodedHeaders = encodeURIComponent(JSON.stringify(headersPayload));
  const encodedRoom = roomId ? encodeURIComponent(String(roomId)) : "";
  return playlist
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const segmentUrl = ensureAbsolute(trimmed, baseUrl);
        const encodedSegment = encodeURIComponent(segmentUrl);
        const roomQuery = encodedRoom ? `&roomId=${encodedRoom}` : "";
        return `/api/hls/proxy?url=${encodedSegment}&headers=${encodedHeaders}${roomQuery}`;
      }
      return line;
    })
    .join("\n");
};

router.post("/analyze", async (req, res) => {
  const { url, headers, roomId } = req.body || {};
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
    const encodedHeaders = encodeURIComponent(JSON.stringify(headerPayload || {}));
    const encodedRoom = roomId ? encodeURIComponent(String(roomId)) : "";
    const roomQuery = encodedRoom ? `&roomId=${encodedRoom}` : "";

    if (qualities.length > 0) {
      return res.json({
        type: "master",
        qualities: qualities.map((quality, index) => ({
          id: `${quality.resolution ?? "auto"}-${index}`,
          resolution: quality.resolution,
          bitrate: quality.bitrate,
          proxiedUrl: `/api/hls/proxy?url=${encodeURIComponent(
            quality.url
          )}&headers=${encodedHeaders}${roomQuery}`,
          url: quality.url,
        })),
      });
    }

    return res.json({
      type: "direct",
      proxiedUrl: `/api/hls/proxy?url=${encodeURIComponent(
        finalUrl
      )}&headers=${encodedHeaders}${roomQuery}`,
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

  const roomId = req.query.roomId ? String(req.query.roomId) : "";
  const headerPayload = parseHeaders(normalizeUrl(req.query.headers) ?? "{}");
  const cacheKey = `${target}::${req.query.headers || ""}`;
  const cached = await getDiskCache(roomId, cacheKey);
  if (cached) {
    res.setHeader("Content-Type", cached.contentType || "application/octet-stream");
    if (cached.size) {
      res.setHeader("Content-Length", cached.size);
    }
    const stream = createReadStream(cached.dataPath);
    stream.on("error", () => res.status(500).end());
    return stream.pipe(res);
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
      const rewritten = rewritePlaylist(playlistText, finalUrl, headerPayload, roomId);
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
      if (!upstream.body) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        await setDiskCache(roomId, cacheKey, buffer, contentType);
        return res.send(buffer);
      }
      await streamSegmentToCache({
        roomId,
        cacheKey,
        upstream,
        res,
        contentType,
      });
      return;
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
