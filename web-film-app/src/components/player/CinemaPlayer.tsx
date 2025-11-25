import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { api, buildApiUrl } from "../../lib/api";
import type { HlsAnalyzeResponse } from "../../types/api";

type StreamSource = {
  type?: "mp4" | "hls";
  url?: string;
  headers?: Record<string, string>;
};

type QualityOption = {
  id: string;
  label: string;
  description?: string;
  url: string;
};

interface CinemaPlayerProps {
  stream?: StreamSource | null;
  title: string;
  poster?: string;
}

const formatQualityLabel = (resolution?: string) => {
  if (!resolution) return "Auto";
  const [w, h] = resolution.toLowerCase().split("x");
  if (h) return `${h}p`;
  if (w) return `${w}p`;
  return resolution;
};

export function CinemaPlayer({ stream, title, poster }: CinemaPlayerProps) {
  const resolvedStream = stream?.url ? stream : null;
  const [status, setStatus] = useState<string>("Đang khởi tạo player...");
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [activeQuality, setActiveQuality] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    setQualityOptions([]);
    setActiveQuality(null);
    if (!resolvedStream?.url) {
      setStatus("Chưa có URL nguồn để phát.");
      return;
    }
    if (resolvedStream.type === "hls") {
      analyzeHls(resolvedStream.url, resolvedStream.headers || {});
    } else {
      const absoluteUrl = buildApiUrl(resolvedStream.url);
      const option: QualityOption = {
        id: "direct-mp4",
        label: "Nguồn gốc",
        description: "MP4",
        url: absoluteUrl,
      };
      setQualityOptions([option]);
      setActiveQuality(option.id);
      setStatus("Sẵn sàng phát nguồn MP4 trực tiếp.");
    }
  }, [resolvedStream]);

  const analyzeHls = async (
    url: string,
    headers: Record<string, string>
  ) => {
    setAnalyzing(true);
    setStatus("Đang phân tích playlist HLS và tạo proxy an toàn...");
    try {
      const result = (await api.hls.analyze({
        url,
        headers,
      })) as HlsAnalyzeResponse;
      const options: QualityOption[] = [];
      if (result.type === "master" && result.qualities?.length) {
        for (const quality of result.qualities) {
          options.push({
            id: quality.id,
            label: formatQualityLabel(quality.resolution),
            description: quality.bitrate
              ? `${quality.bitrate} Mbps`
              : undefined,
            url: buildApiUrl(quality.proxiedUrl ?? quality.url ?? ""),
          });
        }
      } else if (result.proxiedUrl) {
        options.push({
          id: "single-hls",
          label: "Nguồn chính",
          description: "HLS",
          url: buildApiUrl(result.proxiedUrl ?? result.url ?? ""),
        });
      }

      if (!options.length) {
        options.push({
          id: "fallback-hls",
          label: "Link gốc",
          url,
        });
      }

      setQualityOptions(options);
      setActiveQuality(options[0]?.id ?? null);
      setStatus("Đã sẵn sàng phát qua proxy HLS.");
    } catch (error) {
      console.error("HLS analyze failed", error);
      setStatus(
        error instanceof Error
          ? `Lỗi phân tích HLS: ${error.message}`
          : "Không phân tích được playlist HLS."
      );
      const fallback: QualityOption[] = url
        ? [
            {
              id: "fallback-hls",
              label: "Link gốc",
              url,
            },
          ]
        : [];
      setQualityOptions(fallback);
      setActiveQuality(fallback[0]?.id ?? null);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    const source = qualityOptions.find((option) => option.id === activeQuality);
    if (!video || !source?.url) {
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = source.url.toLowerCase().includes(".m3u8");
    if (isHlsSource && Hls.isSupported()) {
      const hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 120,
      });
      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(source.url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("Đang phát...");
        void video.play().catch(() => undefined);
      });
      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setStatus("Nguồn HLS bị gián đoạn, thử tải lại chất lượng khác.");
        }
      });
    } else {
      video.src = source.url;
      video.load();
      const autoPlay = () => void video.play().catch(() => undefined);
      video.addEventListener("loadedmetadata", autoPlay, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeQuality, qualityOptions]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-transparent p-4 shadow-2xl shadow-black/40">
        <video
          ref={videoRef}
          poster={poster}
          controls
          playsInline
          controlsList="nodownload"
          aria-label={`Trình phát ${title}`}
          title={title}
          className="aspect-video w-full rounded-[20px] bg-black object-cover"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-300">
            {resolvedStream?.type === "hls" ? "HLS Secure" : "Direct MP4"}
          </span>
          {analyzing && (
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200">
              Đang đồng bộ chất lượng...
            </span>
          )}
          <span className="text-slate-400">{status}</span>
        </div>
      </div>
      {qualityOptions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveQuality(option.id)}
                className={`rounded-full border px-4 py-1 text-xs transition ${
                  activeQuality === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 text-slate-300 hover:border-primary/60 hover:text-white"
                }`}
              >
                {option.label}
                {option.description && (
                  <span className="ml-2 text-[11px] text-slate-500">
                    {option.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {!resolvedStream?.url && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          Không tìm thấy link phát. Hãy vào trang admin để cập nhật URL HLS hoặc
          MP4 cho phim này.
        </div>
      )}
    </div>
  );
}
