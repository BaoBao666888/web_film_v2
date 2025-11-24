import { Router } from "express";
import fetch from "node-fetch";
import { pipeline } from "node:stream/promises";

const router = Router();

const DEFAULT_REFERER =
  process.env.HLS_DEFAULT_REFERER || "https://rophim.net/";

const DEFAULT_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Origin: safeOrigin(DEFAULT_REFERER),
  Referer: DEFAULT_REFERER,
  "Sec-Fetch-Site": "cross-site",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

function safeOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return "https://rophim.net";
  }
}

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
  return {
    ...DEFAULT_HEADERS,
    ...Object.fromEntries(
      Object.entries(customHeaders).map(([key, val]) => [key, String(val)])
    ),
  };
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

  const headerPayload = parseHeaders(
    normalizeUrl(req.query.headers) ?? "{}"
  );

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
    await pipeline(upstream.body, res);
  } catch (error) {
    console.error("HLS proxy error:", error);
    res.status(500).send("Lỗi proxy HLS.");
  }
});

export default router;
