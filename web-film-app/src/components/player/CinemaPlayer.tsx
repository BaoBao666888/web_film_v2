import { useEffect, useRef, useState, type ReactNode } from "react";
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
  className?: string;
}

const formatQualityLabel = (resolution?: string) => {
  if (!resolution) return "Auto";
  const [w, h] = resolution.toLowerCase().split("x");
  if (h) return `${h}p`;
  if (w) return `${w}p`;
  return resolution;
};

export function CinemaPlayer({ stream, title, poster, className }: CinemaPlayerProps) {
  const resolvedStream = stream?.url ? stream : null;
  const [status, setStatus] = useState<string>("Đang khởi tạo player...");
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [activeQuality, setActiveQuality] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedPresets = [0.75, 1, 1.25, 1.5];

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
    setPipSupported(document.pictureInPictureEnabled ?? false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnter = () => setPipActive(true);
    const handleLeave = () => setPipActive(false);
    video.addEventListener("enterpictureinpicture", handleEnter);
    video.addEventListener("leavepictureinpicture", handleLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnter);
      video.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, []);

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlayState = () => setIsPlaying(!video.paused);
    const syncMuteState = () => setIsMuted(video.muted);
    const syncDuration = () => setDuration(video.duration || 0);
    const syncTime = () => setCurrentTime(video.currentTime || 0);
    const syncBuffered = () => {
      if (!video.duration || !video.buffered.length) {
        setBuffered(0);
        return;
      }
      const current = video.currentTime;
      let end = 0;
      for (let i = 0; i < video.buffered.length; i += 1) {
        const start = video.buffered.start(i);
        const rangeEnd = video.buffered.end(i);
        if (current >= start && current <= rangeEnd) {
          end = rangeEnd;
          break;
        }
      }
      setBuffered(Math.min(end, video.duration));
    };

    syncPlayState();
    syncMuteState();
    syncDuration();
    syncTime();
    syncBuffered();

    video.addEventListener("play", syncPlayState);
    video.addEventListener("pause", syncPlayState);
    video.addEventListener("volumechange", syncMuteState);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("progress", syncBuffered);
    video.addEventListener("loadeddata", syncBuffered);

    return () => {
      video.removeEventListener("play", syncPlayState);
      video.removeEventListener("pause", syncPlayState);
      video.removeEventListener("volumechange", syncMuteState);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("progress", syncBuffered);
      video.removeEventListener("loadeddata", syncBuffered);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  const handleSeek = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(video.currentTime + delta, video.duration || Infinity));
    video.currentTime = next;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const next = !isMuted;
    if (video) {
      video.muted = next;
    }
    setIsMuted(next);
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || !pipSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP toggle failed", error);
    }
  };

  const toggleFullscreen = async () => {
    const wrapper = playerRef.current;
    if (!wrapper) return;
    try {
      if (document.fullscreenElement === wrapper) {
        await document.exitFullscreen();
      } else {
        await wrapper.requestFullscreen?.();
      }
    } catch (error) {
      console.error("Fullscreen toggle failed", error);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const cycleSpeed = () => {
    const currentIndex = speedPresets.findIndex((s) => s === playbackSpeed);
    const next = speedPresets[(currentIndex + 1) % speedPresets.length];
    handleSpeedChange(next);
  };

  const handleProgressChange = (value: number) => {
    const video = videoRef.current;
    if (!video || Number.isNaN(value)) return;
    const clamped = Math.max(0, Math.min(value, duration || 0));
    video.currentTime = clamped;
    setCurrentTime(clamped);
    showControls();
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "00:00";
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2200);
  };

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const safeDuration = duration > 0 ? duration : 0;
  const playedPercent = safeDuration ? Math.min((currentTime / safeDuration) * 100, 100) : 0;
  const bufferedAhead = Math.max(buffered - currentTime, 0);
  const bufferedAheadPercent = safeDuration ? Math.min((bufferedAhead / safeDuration) * 100, 100 - playedPercent) : 0;
  const bufferEndPercent = Math.min(playedPercent + bufferedAheadPercent, 100);
  const showKnob = safeDuration > 0 && currentTime > 0.05;

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
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 90,
        maxMaxBufferLength: 120,
        maxBufferSize: 90 * 1000 * 1000,
        maxBufferHole: 0.5,
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
    <div className={`space-y-4 ${className ?? ""}`}>
      <div
        ref={playerRef}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        onMouseLeave={() => setControlsVisible(false)}
        className={`relative overflow-hidden ${
          isFullscreen
            ? "rounded-none border-0 bg-black p-0 shadow-none"
            : "rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/85 to-black p-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        }`}
      >
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/5" />
        <video
          ref={videoRef}
          poster={poster}
          controls={false}
          playsInline
          preload="auto"
          controlsList="nodownload noremoteplayback noplaybackrate"
          disableRemotePlayback
          onDoubleClick={toggleFullscreen}
          onClick={togglePlayPause}
          aria-label={`Trình phát ${title}`}
          title={title}
          className={`aspect-video w-full bg-black object-contain ${
            isFullscreen ? "min-h-screen" : "min-h-[360px] md:min-h-[440px] lg:min-h-[520px] rounded-[20px]"
          }`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div
          className={`pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-xs transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-slate-200">
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              {resolvedStream?.type === "hls" ? "HLS secure proxy" : "Direct MP4"}
            </span>
            {analyzing && (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200">
                Đang đồng bộ chất lượng...
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
              {status}
            </span>
          </div>

          <div className="pointer-events-auto flex flex-col gap-3 text-white">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/70">{formatTime(currentTime)}</span>
              <div className="relative flex-1 py-1">
                <div className="relative h-[6px] overflow-hidden rounded-full bg-white/15">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/80 z-20"
                    style={{ width: `${playedPercent}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-white/30 z-10"
                    style={{
                      left: `${playedPercent}%`,
                      width: `${Math.max(bufferEndPercent - playedPercent, 0)}%`,
                      opacity: bufferedAheadPercent > 0 ? 1 : 0,
                    }}
                  />
                </div>
                <span
                  className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_2px_rgba(15,23,42,0.7),0_0_8px_rgba(255,107,107,0.5)] transition-opacity ${
                    showKnob ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    left: `${showKnob ? playedPercent : 0}%`,
                    zIndex: 30,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step="0.1"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent opacity-0"
                />
              </div>
              <span className="text-[11px] text-white/70">{formatTime(duration)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ControlButton
                  label={isPlaying ? "Tạm dừng" : "Phát"}
                  onClick={togglePlayPause}
                  active={isPlaying}
                >
                  {isPlaying ? <IconPause /> : <IconPlay />}
                </ControlButton>
                <ControlButton label="Tua lùi 10 giây" onClick={() => handleSeek(-10)}>
                  <IconBack10 />
                </ControlButton>
                <ControlButton label="Tua nhanh 10 giây" onClick={() => handleSeek(10)}>
                  <IconForward10 />
                </ControlButton>
                <ControlButton label={isMuted ? "Bật tiếng" : "Tắt tiếng"} onClick={toggleMute} active={isMuted}>
                  {isMuted ? <IconMute /> : <IconVolume />}
                </ControlButton>
                <ControlButton label="Chuyển tốc độ" onClick={cycleSpeed}>
                  <span className="text-[11px] font-semibold">{playbackSpeed.toFixed(2).replace(/\.00$/, "")}x</span>
                </ControlButton>
              </div>

              <div className="flex items-center gap-2">
                {pipSupported && (
                  <ControlButton label="Hình trong hình" onClick={togglePictureInPicture} active={pipActive}>
                    <IconPiP />
                  </ControlButton>
                )}
                <ControlButton label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={toggleFullscreen} active={isFullscreen}>
                  {isFullscreen ? <IconCompress /> : <IconExpand />}
                </ControlButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {qualityOptions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Chất lượng
            </span>
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveQuality(option.id)}
                className={`rounded-full border px-4 py-1.5 text-xs transition ${
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

function ControlButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border text-white transition hover:-translate-y-[1px] hover:border-primary/60 hover:bg-white/10 ${
        active ? "border-primary bg-primary/20 text-primary shadow-[0_10px_30px_rgba(255,107,107,0.25)]" : "border-white/15 bg-black/40"
      }`}
    >
      {children}
    </button>
  );
}

const iconProps = "h-4 w-4 stroke-current";

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M8 5.5v13l9-6.5-9-6.5z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M9 6.5v11M15 6.5v11" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconBack10() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M11 6 7 4v4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12.5A6 6 0 1 0 13 7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14h-2v2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconForward10() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="m13 6 4-2v4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 12.5A6 6 0 1 1 11 7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14h2v2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconVolume() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M5 10v4h3l5 4V6l-5 4H5z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9.5c1 .6 1.5 1.6 1.5 2.5 0 .9-.5 1.9-1.5 2.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconMute() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M5 10v4h3l5 4V6l-5 4H5z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17.5 9-3 3m0 0-3 3m3-3 3 3m-3-3 3-3" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPiP() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth="1.6" />
      <rect x="12.5" y="10.5" width="5.5" height="4.5" rx="1" strokeWidth="1.6" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCompress() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconProps}>
      <path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
