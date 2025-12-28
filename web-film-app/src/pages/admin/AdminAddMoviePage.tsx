import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import type { Episode, Movie } from "../../types/api";

type EpisodeInput = Episode & {
  videoUrl: string;
  videoType: Movie["videoType"];
  status: "public" | "hidden" | "premiere";
  premiereAt: string;
  previewEnabled: boolean;
  previewPrice: number;
};

type VideoSource = "upload" | "hls" | "mp4";

type FormState = {
  title: string;
  director: string;
  cast: string;
  year: number;
  duration: string;
  rating: number;
  tags: string;
  seriesStatus: "" | "Còn tiếp" | "Hoàn thành" | "Tạm ngưng";
  synopsis: string;
  poster: string;
  thumbnail: string;
  trailerUrl: string;
  videoUrl: string;
  videoType: Movie["videoType"];
  videoSource: VideoSource;
  videoHeaders: string;
  type: "single" | "series";
  episodes: EpisodeInput[];
  country: string;
  status: "public" | "hidden" | "premiere";
  premiereAt: string;
  previewEnabled: boolean;
  previewPrice: number;
};

const SERIES_STATUS_TAGS = ["Còn tiếp", "Hoàn thành", "Tạm ngưng"];
const TEMP_UPLOAD_MARKER = "/uploads/tmp/";

const isTempUploadUrl = (value?: string): value is string =>
  Boolean(value && value.includes(TEMP_UPLOAD_MARKER));

const cleanupTempUploads = async (urls: Array<string | undefined>) => {
  for (const url of urls) {
    if (!isTempUploadUrl(url)) continue;
    try {
      await api.upload.deleteTemp(url);
    } catch {
      // ignore cleanup errors
    }
  }
};

const collectTempUrls = (payload: {
  poster?: string;
  thumbnail?: string;
  videoUrl?: string;
  episodes?: EpisodeInput[];
}) => [
  payload.poster,
  payload.thumbnail,
  payload.videoUrl,
  ...(payload.episodes?.map((ep) => ep.videoUrl) ?? []),
];

const toISOFromDateTimeLocal = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export function AdminAddMoviePage() {
  const [form, setForm] = useState<FormState>({
    title: "",
    director: "",
    cast: "",
    year: new Date().getFullYear(),
    duration: "1h 55m",
    rating: 4.5,
    tags: "Hành động, Sci-fi",
    seriesStatus: "",
    synopsis: "",
    poster:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=900&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80",
    trailerUrl: "",
    videoUrl: "",
    videoType: "mp4",
    videoSource: "upload",
    videoHeaders: "",
    type: "single",
    episodes: [],
    country: "",
    status: "public",
    premiereAt: "",
    previewEnabled: false,
    previewPrice: 0,
  });

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [episodeUploadingIndex, setEpisodeUploadingIndex] = useState<
    number | null
  >(null);
  const tempUploadsRef = useRef({
    poster: "",
    thumbnail: "",
    videoUrl: "",
    episodes: [] as string[],
  });

  useEffect(() => {
    let didLoad = false;
    fetch("/countries.json")
      .then((res) => res.json())
      .then((list: Array<{ name?: string } | string>) => {
        if (didLoad) return;
        const names = (list || [])
          .map((item) =>
            typeof item === "string" ? item.trim() : (item?.name || "").trim()
          )
          .filter((name) => Boolean(name));
        setCountryOptions(Array.from(new Set(names)));
        didLoad = true;
      })
      .catch(() => setCountryOptions([]));
    return () => {
      didLoad = true;
    };
  }, []);

  useEffect(() => {
    tempUploadsRef.current = {
      poster: form.poster,
      thumbnail: form.thumbnail,
      videoUrl: form.videoUrl,
      episodes: form.episodes.map((ep) => ep.videoUrl),
    };
  }, [form.poster, form.thumbnail, form.videoUrl, form.episodes]);

  useEffect(() => {
    return () => {
      void cleanupTempUploads(collectTempUrls(tempUploadsRef.current));
    };
  }, []);

  const updateField = (
    key: keyof FormState,
    value: string | number | boolean
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addEpisodeRow = () => {
    setForm((prev) => {
      const nextNumber = (prev.episodes?.length || 0) + 1;
      return {
        ...prev,
        episodes: [
          ...(prev.episodes || []),
          {
            number: nextNumber,
            title: `Tập ${nextNumber}`,
            videoUrl: "",
            videoType: prev.videoType,
            duration: "",
            status:
              prev.status === "hidden"
                ? "hidden"
                : prev.status === "premiere"
                ? "premiere"
                : "public",
            premiereAt: "",
            previewEnabled: false,
            previewPrice: 0,
          },
        ],
      };
    });
  };

  const updateEpisodeField = (
    index: number,
    key:
      | "title"
      | "videoUrl"
      | "videoType"
      | "duration"
      | "status"
      | "premiereAt"
      | "previewEnabled"
      | "previewPrice",
    value: string | boolean | number | undefined
  ) => {
    setForm((prev) => ({
      ...prev,
      episodes: prev.episodes.map((ep, idx) => {
        if (idx !== index) return ep;
        if (key === "videoType") {
          return {
            ...ep,
            videoType: (value || "hls") as Movie["videoType"],
          };
        }
        if (key === "status") {
          return {
            ...ep,
            status: (value || "public") as EpisodeInput["status"],
          };
        }
        if (key === "previewEnabled") {
          const enabled = Boolean(value);
          return {
            ...ep,
            previewEnabled: enabled,
            previewPrice: enabled ? ep.previewPrice : 0,
          };
        }
        return { ...ep, [key]: value ?? "" };
      }),
    }));
  };

  const removeEpisode = (index: number) => {
    const removed = form.episodes[index]?.videoUrl;
    if (isTempUploadUrl(removed)) {
      void cleanupTempUploads([removed]);
    }
    setForm((prev) => ({
      ...prev,
      episodes: prev.episodes.filter((_, idx) => idx !== index),
    }));
  };

  const handleFileUpload = async (
    file: File,
    field: "poster" | "thumbnail" | "videoUrl"
  ) => {
    setUploading(true);
    try {
      const previousUrl = form[field];
      const url = await api.upload.single(file);
      if (previousUrl && previousUrl !== url && isTempUploadUrl(previousUrl)) {
        await cleanupTempUploads([previousUrl]);
      }
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoSourceChange = async (value: VideoSource) => {
    if (value !== "upload" && isTempUploadUrl(form.videoUrl)) {
      await cleanupTempUploads([form.videoUrl]);
    }

    setForm((prev) => {
      const keepTemp = value === "upload" && isTempUploadUrl(prev.videoUrl);
      const nextVideoUrl =
        value === "upload"
          ? keepTemp
            ? prev.videoUrl
            : ""
          : isTempUploadUrl(prev.videoUrl)
          ? ""
          : prev.videoUrl;
      return {
        ...prev,
        videoSource: value,
        videoType: value === "upload" ? "mp4" : value,
        videoUrl: nextVideoUrl,
        episodes:
          prev.type === "series" && value === "upload"
            ? prev.episodes.map((episode) => ({
                ...episode,
                videoType: "mp4",
              }))
            : prev.episodes,
      };
    });
  };

  const handleEpisodeFileUpload = async (index: number, file: File) => {
    setEpisodeUploadingIndex(index);
    try {
      const previousUrl = form.episodes[index]?.videoUrl;
      const url = await api.upload.single(file);
      if (previousUrl && previousUrl !== url && isTempUploadUrl(previousUrl)) {
        await cleanupTempUploads([previousUrl]);
      }
      setForm((prev) => ({
        ...prev,
        episodes: prev.episodes.map((ep, idx) =>
          idx === index
            ? { ...ep, videoUrl: url, videoType: "mp4" }
            : ep
        ),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setEpisodeUploadingIndex(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = form.videoHeaders
        ? (JSON.parse(form.videoHeaders) as Record<string, string>)
        : {};
    } catch (err) {
      setStatus(
        `Headers JSON không hợp lệ: ${
          err instanceof Error ? err.message : "Kiểm tra lại cú pháp."
        }`
      );
      setLoading(false);
      return;
    }

    try {
      const resolvedVideoType =
        form.type === "series"
          ? (form.videoSource === "upload" ? "mp4" : form.videoType)
          : (form.videoSource === "upload"
              ? "mp4"
              : form.videoSource) as Movie["videoType"];

      if (!form.status) {
        setStatus("Vui lòng chọn trạng thái phim.");
        setLoading(false);
        return;
      }

      const previewPriceValue = Number(form.previewPrice) || 0;
      if (form.previewEnabled && previewPriceValue <= 0) {
        setStatus("Giá xem trước phải lớn hơn 0.");
        setLoading(false);
        return;
      }

      if (form.type === "single" && form.status === "premiere") {
        if (!form.premiereAt) {
          setStatus("Phim công chiếu cần thời gian công chiếu.");
          setLoading(false);
          return;
        }
      }

      const episodes =
        form.type === "series"
          ? form.episodes
              .map((ep, idx) => ({
                number: ep.number || idx + 1,
                title: ep.title || `Tập ${idx + 1}`,
                videoUrl: ep.videoUrl,
                videoType:
                  form.videoSource === "upload"
                    ? "mp4"
                    : (ep.videoType as Movie["videoType"]) ??
                      (form.videoType as Movie["videoType"]) ??
                      "hls",
                duration: ep.duration,
                status:
                  form.status === "hidden"
                    ? "hidden"
                    : ep.status || "public",
                premiereAt: ep.premiereAt
                  ? toISOFromDateTimeLocal(ep.premiereAt)
                  : "",
                previewEnabled: Boolean(ep.previewEnabled),
                previewPrice: Number(ep.previewPrice) || 0,
              }))
              .filter((ep) => ep.videoUrl)
          : [];

      if (form.type === "series" && episodes.length === 0) {
        setStatus("Phim bộ cần ít nhất 1 tập với link video.");
        setLoading(false);
        return;
      }

      if (form.type === "series") {
        if (
          form.status === "public" &&
          !episodes.some((ep) => ep.status === "public")
        ) {
          setStatus("Phim bộ public cần ít nhất 1 tập public.");
          setLoading(false);
          return;
        }
        if (
          form.status === "premiere" &&
          !episodes.some((ep) => ep.status === "premiere")
        ) {
          setStatus("Phim bộ công chiếu cần ít nhất 1 tập công chiếu.");
          setLoading(false);
          return;
        }

        for (const episode of episodes) {
          if (episode.status === "premiere" && !episode.premiereAt) {
            setStatus("Tập công chiếu cần thời gian công chiếu.");
            setLoading(false);
            return;
          }
          if (episode.previewEnabled && episode.previewPrice <= 0) {
            setStatus("Giá xem trước của tập phải lớn hơn 0.");
            setLoading(false);
            return;
          }
        }

        const premiereEpisodes = episodes
          .filter((ep) => ep.status === "premiere")
          .sort((a, b) => a.number - b.number);
        for (let i = 1; i < premiereEpisodes.length; i += 1) {
          const prevTime = new Date(premiereEpisodes[i - 1].premiereAt || "");
          const currentTime = new Date(premiereEpisodes[i].premiereAt || "");
          if (prevTime && currentTime && currentTime <= prevTime) {
            setStatus("Thời gian công chiếu tập sau phải sau tập trước.");
            setLoading(false);
            return;
          }
        }
      }

      const tagList = form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((tag) => !SERIES_STATUS_TAGS.includes(tag));

      const { videoSource, ...payload } = form;

      await api.movies.create({
        ...payload,
        type: form.type,
        country: form.country,
        seriesStatus: form.type === "series" ? form.seriesStatus : "",
        tags: tagList,
        moods: ["Hành động", "Khoa học viễn tưởng"],
        cast: form.cast
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        videoType: resolvedVideoType,
        videoHeaders: parsedHeaders,
        episodes,
        status: form.status,
        premiereAt: form.premiereAt
          ? toISOFromDateTimeLocal(form.premiereAt)
          : "",
        previewEnabled: form.previewEnabled,
        previewPrice: previewPriceValue,
      });

      setStatus("Đã thêm phim mới! Bạn có thể kiểm tra ở mục Quản lý phim.");
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Không thể thêm phim lúc này."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Thêm phim mới"
        description="Form nhập liệu chi tiết để thêm phim mới vào hệ thống."
        actions={
          <Link
            to="/admin/manage"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
          >
            Quay lại quản lý
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30"
      >
        <p className="text-xs text-slate-400">
          <span className="text-red-400">*</span> là trường bắt buộc.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Tên phim <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Tên phim..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Đạo diễn
            </label>
            <input
              type="text"
              value={form.director}
              onChange={(event) => updateField("director", event.target.value)}
              placeholder="Tên đạo diễn"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Diễn viên
          </label>
          <input
            type="text"
            value={form.cast}
            onChange={(event) => updateField("cast", event.target.value)}
            placeholder="Nhập tên các diễn viên, cách nhau bằng dấu phẩy..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Năm sản xuất <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(event) =>
                updateField("year", Number(event.target.value))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Thời lượng <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.duration}
              onChange={(event) => updateField("duration", event.target.value)}
              placeholder="1h 55m"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Rating <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={form.rating}
              onChange={(event) =>
                updateField("rating", Number(event.target.value))
              }
              placeholder="4.5"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Loại phim
          </label>
          <select
            value={form.type}
            onChange={(event) => {
              const nextType = event.target.value as "single" | "series";
              updateField("type", nextType);
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="single">Phim lẻ</option>
            <option value="series">Phim bộ</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
            Trạng thái phim <span className="text-red-400">*</span>
          </label>
          <select
            value={form.status}
            onChange={(event) => {
              const nextStatus = event.target.value as FormState["status"];
              setForm((prev) => ({
                ...prev,
                status: nextStatus,
                premiereAt:
                  nextStatus === "premiere" ? prev.premiereAt : "",
                previewEnabled:
                  nextStatus === "premiere" ? prev.previewEnabled : false,
                previewPrice:
                  nextStatus === "premiere" ? prev.previewPrice : 0,
                episodes: prev.episodes.map((episode) => {
                  if (nextStatus === "hidden") {
                    return {
                      ...episode,
                      status: "hidden",
                      previewEnabled: false,
                      previewPrice: 0,
                    };
                  }
                  return episode;
                }),
              }));
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="public">Hiển thị</option>
            <option value="hidden">Ẩn</option>
            <option value="premiere">Công chiếu</option>
          </select>
        </div>

        {form.status === "premiere" && form.type === "single" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Thời gian công chiếu
              </label>
              <input
                type="datetime-local"
                value={form.premiereAt}
                onChange={(event) =>
                  updateField("premiereAt", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Cho phép xem trước</span>
                <input
                  type="checkbox"
                  checked={form.previewEnabled}
                  onChange={(event) =>
                    updateField("previewEnabled", event.target.checked)
                  }
                  className="h-4 w-4 accent-primary"
                />
              </label>
              {form.previewEnabled && (
                <div className="mt-3">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Giá xem trước (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.previewPrice}
                    onChange={(event) =>
                      updateField("previewPrice", Number(event.target.value))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {form.type === "series" && (
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Trạng thái phim bộ
            </label>
            <select
              value={form.seriesStatus}
              onChange={(event) =>
                updateField(
                  "seriesStatus",
                  event.target.value as FormState["seriesStatus"]
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">-- Chọn trạng thái --</option>
              <option value="Còn tiếp">Còn tiếp</option>
              <option value="Hoàn thành">Hoàn Thành</option>
              <option value="Tạm ngưng">Tạm Ngưng</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Trạng thái sẽ tự thêm vào tag của phim bộ.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Thể loại
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            placeholder="Hành động, Khoa học viễn tưởng..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Mô tả
          </label>
          <textarea
            rows={4}
            value={form.synopsis}
            onChange={(event) => updateField("synopsis", event.target.value)}
            placeholder="Tóm tắt nội dung..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Link poster <span className="text-red-400">*</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={form.poster}
                onChange={(event) => updateField("poster", event.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <label className="cursor-pointer rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-xs text-primary hover:bg-primary/20">
                {uploading ? "..." : "📁"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "poster");
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Link thumbnail
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={form.thumbnail}
                onChange={(event) =>
                  updateField("thumbnail", event.target.value)
                }
                placeholder="https://..."
                className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <label className="cursor-pointer rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-xs text-primary hover:bg-primary/20">
                {uploading ? "..." : "📁"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "thumbnail");
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Link trailer
            </label>
            <input
              type="url"
              value={form.trailerUrl}
              onChange={(event) =>
                updateField("trailerUrl", event.target.value)
              }
              placeholder="https://youtube.com/..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Link phim (video) <span className="text-red-400">*</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={form.videoUrl}
                onChange={(event) =>
                  updateField("videoUrl", event.target.value)
                }
                placeholder={
                  form.videoSource === "upload"
                    ? "Tải file video lên để lấy link"
                    : "https://.../playlist.m3u8"
                }
                disabled={form.type === "series" || form.videoSource === "upload"}
                readOnly={form.videoSource === "upload"}
                className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              {form.type !== "series" && form.videoSource === "upload" && (
                <label className="cursor-pointer rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-xs text-primary hover:bg-primary/20">
                  {uploading ? "..." : "📁"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "videoUrl");
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Định dạng nguồn
            </label>
          {form.type === "series" ? (
            <select
              value={form.videoSource}
              onChange={(event) =>
                handleVideoSourceChange(event.target.value as VideoSource)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="upload">Video upload (mặc định)</option>
              <option value="hls">Link HLS (.m3u8)</option>
              <option value="mp4">Link MP4</option>
            </select>
          ) : (
              <select
                value={form.videoSource}
                onChange={(event) =>
                  handleVideoSourceChange(event.target.value as VideoSource)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="upload">Video upload (mặc định)</option>
                <option value="hls">Link HLS (.m3u8)</option>
                <option value="mp4">Link MP4</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Quốc gia (không bắt buộc)
          </label>
          <input
            type="text"
            list="country-options"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            placeholder="Nhập hoặc chọn nhanh..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <datalist id="country-options">
            {countryOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        {form.type === "series" && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-dark/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Danh sách tập
                </p>
                <p className="text-xs text-slate-400">
                  Điền link và tiêu đề, mặc định tiêu đề sẽ là “Tập + số thứ
                  tự”.
                </p>
              </div>
              <button
                type="button"
                onClick={addEpisodeRow}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-primary hover:text-primary"
              >
                + Thêm tập
              </button>
            </div>

            {form.episodes.length === 0 && (
              <p className="text-xs text-slate-400">
                Chưa có tập nào. Bấm &quot;+ Thêm tập&quot; để bắt đầu với Tập
                1.
              </p>
            )}

            <div className="space-y-3">
              {form.episodes.map((ep, index) => (
                <div
                  key={`ep-${ep.number}-${index}`}
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-3 md:grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_0.7fr_auto]"
                >
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-500">
                      Tiêu đề tập
                    </label>
                    <input
                      value={ep.title}
                      onChange={(event) =>
                        updateEpisodeField(index, "title", event.target.value)
                      }
                      placeholder={`Tập ${ep.number || index + 1}`}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-500">
                      Link video
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={ep.videoUrl}
                        onChange={(event) =>
                          updateEpisodeField(
                            index,
                            "videoUrl",
                            event.target.value
                          )
                        }
                        readOnly={form.videoSource === "upload"}
                        placeholder={
                          form.videoSource === "upload"
                            ? "Tải file video lên"
                            : "https://..."
                        }
                        className="w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                      />
                      {form.videoSource === "upload" && (
                        <label className="cursor-pointer rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20">
                          {episodeUploadingIndex === index ? "..." : "📁"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleEpisodeFileUpload(index, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-500">
                      Thời lượng
                    </label>
                    <input
                      value={ep.duration ?? ""}
                      onChange={(event) =>
                        updateEpisodeField(
                          index,
                          "duration",
                          event.target.value
                        )
                      }
                      placeholder="45m"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-500">
                      Định dạng
                    </label>
                    <select
                      value={ep.videoType || form.videoType || "hls"}
                      onChange={(event) =>
                        updateEpisodeField(
                          index,
                          "videoType",
                          event.target.value as Movie["videoType"]
                        )
                      }
                      disabled={form.videoSource === "upload"}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                    >
                      <option value="hls">HLS</option>
                      <option value="mp4">MP4</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-500">
                      Trạng thái
                    </label>
                    <select
                      value={ep.status}
                      onChange={(event) =>
                        updateEpisodeField(
                          index,
                          "status",
                          event.target.value as EpisodeInput["status"]
                        )
                      }
                      disabled={form.status === "hidden"}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                    >
                      <option value="public">Public</option>
                      <option value="hidden">Ẩn</option>
                      <option value="premiere">Công chiếu</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeEpisode(index)}
                      className="rounded-full border border-red-400/50 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/10"
                    >
                      Xoá
                    </button>
                  </div>
                  {ep.status === "premiere" && (
                    <div className="md:col-span-6 grid gap-3 rounded-xl border border-white/10 bg-dark/60 p-3 md:grid-cols-[1fr_1fr]">
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-slate-500">
                          Thời gian công chiếu
                        </label>
                        <input
                          type="datetime-local"
                          value={ep.premiereAt}
                          onChange={(event) =>
                            updateEpisodeField(
                              index,
                              "premiereAt",
                              event.target.value
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                          <span>Cho phép xem trước</span>
                          <input
                            type="checkbox"
                            checked={ep.previewEnabled}
                            onChange={(event) =>
                              updateEpisodeField(
                                index,
                                "previewEnabled",
                                event.target.checked
                              )
                            }
                            className="h-4 w-4 accent-primary"
                          />
                        </label>
                        {ep.previewEnabled && (
                          <input
                            type="number"
                            min={0}
                            value={ep.previewPrice}
                            onChange={(event) =>
                              updateEpisodeField(
                                index,
                                "previewPrice",
                                Number(event.target.value)
                              )
                            }
                            placeholder="Giá xem trước (VND)"
                            className="w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Headers (JSON) cho nguồn được bảo vệ
          </label>
          <textarea
            rows={3}
            value={form.videoHeaders}
            onChange={(event) =>
              updateField("videoHeaders", event.target.value)
            }
            placeholder='{"Referer":"https://example.com/"} (bỏ trống để dùng header mặc định)'
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <p className="mt-2 text-xs text-slate-400">
            Nếu để trống, hệ thống sẽ tự áp dụng bộ headers mặc định (Referer
            https://goatembed.com/ + user-agent chuẩn). Điền JSON khi cần
            override riêng cho phim.
          </p>
        </div> */}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Đang lưu..." : "Lưu phim"}
        </button>

        {status && <p className="text-xs text-emerald-400">{status}</p>}
      </form>
    </div>
  );
}
