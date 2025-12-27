import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminMoviesResponse, Episode, Movie } from "../../types/api";
import { api } from "../../lib/api";

type EpisodeInput = Episode & {
  videoUrl: string;
  videoType: Movie["videoType"];
  clientId: string; // ✅ stable key for React
};

type VideoSource = "upload" | "hls" | "mp4";

type FormState = {
  title: string;
  synopsis: string;
  year: string;
  duration: string;
  rating: string;
  tags: string;
  moods: string;
  cast: string;
  director: string;
  trailerUrl: string;
  videoUrl: string;
  videoType: Movie["videoType"];
  videoSource: VideoSource;
  videoHeaders: string;
  thumbnail: string;
  poster: string;
  type: "single" | "series";
  episodes: EpisodeInput[];
  country: string;
  seriesStatus: "" | "Còn tiếp" | "Hoàn thành" | "Tạm ngưng";
};

const SERIES_STATUS_TAGS = ["Còn tiếp", "Hoàn thành", "Tạm ngưng"] as const;
const TEMP_UPLOAD_MARKER = "/uploads/tmp/";

const isTempUploadUrl = (value?: string): value is string =>
  Boolean(value && value.includes(TEMP_UPLOAD_MARKER));

const getDefaultVideoSource = (videoUrl?: string, videoType?: Movie["videoType"]) =>
  videoUrl && videoUrl.includes("/uploads/") ? "upload" : videoType || "hls";

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

function makeClientId() {
  // works in modern browsers
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Convert datetime-local string (YYYY-MM-DDTHH:mm) -> ISO string
function toISOFromDateTimeLocal(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function AdminManagePage() {
  const [page, setPage] = useState(1);
  const limit = 12;

  const [filterHidden, setFilterHidden] = useState<
    "all" | "visible" | "hidden"
  >("all");

  const { data, loading, error, refetch } = useFetch<AdminMoviesResponse>(
    `/admin/movies?page=${page}&limit=${limit}`,
    [page]
  );

  const movies = data?.movies ?? [];
  const meta = data?.meta;

  const filteredMovies = movies.filter((movie) => {
    if (filterHidden === "visible") return !movie.isHidden;
    if (filterHidden === "hidden") return movie.isHidden;
    return true;
  });

  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  const [formData, setFormData] = useState<FormState>({
    title: "",
    synopsis: "",
    year: "",
    duration: "",
    rating: "",
    tags: "",
    moods: "",
    cast: "",
    director: "",
    trailerUrl: "",
    videoUrl: "",
    videoType: "mp4",
    videoSource: "upload",
    videoHeaders: "",
    thumbnail: "",
    poster: "",
    type: "single",
    episodes: [],
    country: "",
    seriesStatus: "",
  });

  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [hideDialogMovie, setHideDialogMovie] = useState<Movie | null>(null);
  const [unhideDate, setUnhideDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const tempUploadsRef = useRef({
    poster: "",
    thumbnail: "",
    videoUrl: "",
  });

  useEffect(() => {
    fetch("/countries.json")
      .then((res) => res.json())
      .then((list: Array<{ name?: string } | string>) => {
        const names = (list || [])
          .map((item) =>
            typeof item === "string" ? item.trim() : (item?.name || "").trim()
          )
          .filter((name) => Boolean(name));
        setCountryOptions(Array.from(new Set(names)));
      })
      .catch(() => setCountryOptions([]));
  }, []);

  useEffect(() => {
    tempUploadsRef.current = {
      poster: formData.poster,
      thumbnail: formData.thumbnail,
      videoUrl: formData.videoUrl,
    };
  }, [formData.poster, formData.thumbnail, formData.videoUrl]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xoá phim này?")) return;
    await api.movies.delete(id);
    refetch();
  };

  const handleToggleVisibility = async (movie: Movie) => {
    const nextHidden = !movie.isHidden;

    // ✅ datetime-local -> ISO to reduce timezone parsing issues on backend
    const isoUnhide = nextHidden ? toISOFromDateTimeLocal(unhideDate) : "";

    try {
      await api.admin.toggleMovieVisibility(
        movie.id,
        nextHidden,
        nextHidden ? isoUnhide || undefined : undefined
      );
      setHideDialogMovie(null);
      setUnhideDate("");
      refetch();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Không thể thay đổi trạng thái"
      );
    }
  };

  const handleFileUpload = async (
    file: File,
    field: "poster" | "thumbnail" | "videoUrl"
  ) => {
    // ✅ upload should NOT depend on editingMovie
    setUploading(true);
    try {
      const previousUrl = formData[field];
      const url = await api.upload.single(file);
      if (previousUrl && previousUrl !== url && isTempUploadUrl(previousUrl)) {
        await cleanupTempUploads([previousUrl]);
      }
      setFormData((prev) => ({ ...prev, [field]: url }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleCloseEdit = () => {
    void cleanupTempUploads(Object.values(tempUploadsRef.current));
    setEditingMovie(null);
    setSubmitStatus(null);
  };

  const handleVideoSourceChange = async (value: VideoSource) => {
    if (value !== "upload" && isTempUploadUrl(formData.videoUrl)) {
      await cleanupTempUploads([formData.videoUrl]);
    }

    setFormData((prev) => {
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
      };
    });
  };

  const addEpisodeRow = () => {
    setFormData((prev) => {
      const nextNumber = (prev.episodes?.length || 0) + 1;
      return {
        ...prev,
        episodes: [
          ...(prev.episodes || []),
          {
            clientId: makeClientId(),
            number: nextNumber,
            title: `Tập ${nextNumber}`,
            videoUrl: "",
            videoType: prev.videoType as Movie["videoType"],
            duration: "",
          },
        ],
      };
    });
  };

  const updateEpisodeField = (
    index: number,
    key: "title" | "videoUrl" | "videoType" | "duration",
    value: string | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      episodes: prev.episodes.map((ep, idx) => {
        if (idx !== index) return ep;
        if (key === "videoType") {
          return { ...ep, videoType: (value || "hls") as Movie["videoType"] };
        }
        return { ...ep, [key]: value ?? "" };
      }),
    }));
  };

  const removeEpisode = (index: number) => {
    // ✅ re-number after remove
    setFormData((prev) => ({
      ...prev,
      episodes: prev.episodes
        .filter((_, idx) => idx !== index)
        .map((ep, i) => ({ ...ep, number: i + 1 })),
    }));
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Quản lý phim"
        description="Danh sách phim hiện có và các thao tác quản trị nhanh."
        actions={
          <Link
            to="/admin/add-movie"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
          >
            + Thêm phim
          </Link>
        }
      />

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setFilterHidden("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filterHidden === "all"
              ? "bg-primary text-dark"
              : "border border-white/20 text-slate-300 hover:border-primary hover:text-primary"
          }`}
        >
          Tất cả ({movies.length})
        </button>
        <button
          onClick={() => setFilterHidden("visible")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filterHidden === "visible"
              ? "bg-primary text-dark"
              : "border border-white/20 text-slate-300 hover:border-primary hover:text-primary"
          }`}
        >
          Đang hiện ({movies.filter((m) => !m.isHidden).length})
        </button>
        <button
          onClick={() => setFilterHidden("hidden")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filterHidden === "hidden"
              ? "bg-primary text-dark"
              : "border border-white/20 text-slate-300 hover:border-primary hover:text-primary"
          }`}
        >
          Bị ẩn ({movies.filter((m) => m.isHidden).length})
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-sm text-slate-300">
          <span>
            Trang {meta?.page ?? page} / {meta?.totalPages ?? "?"} •{" "}
            {meta?.totalItems ?? movies.length} phim
            {filterHidden !== "all" && (
              <span className="ml-2 text-xs text-slate-400">
                (Hiển thị: {filteredMovies.length})
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary disabled:opacity-50"
            >
              ← Trang trước
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((p) =>
                  meta?.totalPages ? Math.min(meta.totalPages, p + 1) : p + 1
                )
              }
              disabled={meta?.totalPages ? page >= meta.totalPages : false}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary disabled:opacity-50"
            >
              Trang sau →
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-4">Phim</th>
              <th className="px-6 py-4">Loại / Tags</th>
              <th className="px-6 py-4">Năm</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-6 text-center text-slate-400"
                >
                  Đang tải danh sách phim…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filteredMovies.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-6 text-center text-slate-400"
                >
                  {filterHidden === "hidden"
                    ? "Không có phim nào bị ẩn"
                    : filterHidden === "visible"
                    ? "Không có phim nào đang hiện"
                    : "Không có phim nào"}
                </td>
              </tr>
            )}

            {filteredMovies.map((movie) => (
              <tr
                key={movie.id}
                className="border-t border-white/10 transition hover:bg-white/5"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="h-16 w-12 rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {movie.title}
                        </p>
                        {movie.isHidden && (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                            ẨN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        ID: {movie.id.toUpperCase()}
                      </p>
                      {movie.isHidden && movie.unhideDate && (
                        <p className="text-[10px] text-slate-500">
                          Mở lại:{" "}
                          {new Date(movie.unhideDate).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">
                      {movie.type === "series" ? "Phim bộ" : "Phim lẻ"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {movie.tags?.join(", ")}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4 text-xs text-slate-300">
                  {movie.year}
                </td>
                <td className="px-6 py-4 text-xs text-slate-300">
                  {typeof movie.rating === "number"
                    ? movie.rating.toFixed(1)
                    : ""}
                </td>

                <td className="px-6 py-4 text-right text-xs">
                  <button
                    onClick={() => setHideDialogMovie(movie)}
                    className="mr-2 rounded-full border border-orange-400/40 px-3 py-1 text-orange-300 hover:bg-orange-500/10"
                  >
                    {movie.isHidden ? "Hiện" : "Ẩn"}
                  </button>

                  <button
                    onClick={() => {
                      setEditingMovie(movie);
                      setSubmitStatus(null);

                      setFormData({
                        title: movie.title ?? "",
                        synopsis: movie.synopsis ?? "",
                        year: String(movie.year ?? ""),
                        duration: movie.duration ?? "",
                        rating:
                          typeof movie.rating === "number"
                            ? String(movie.rating)
                            : "",
                        tags:
                          movie.tags
                            ?.filter(
                              (tag) => !SERIES_STATUS_TAGS.includes(tag as any)
                            )
                            .join(", ") ?? "",
                        moods: movie.moods?.join(", ") ?? "",
                        cast: movie.cast?.join(", ") ?? "",
                        director: movie.director ?? "",
                        trailerUrl: movie.trailerUrl ?? "",
                        videoUrl: movie.videoUrl ?? "",
                        videoType:
                          (movie.videoType as Movie["videoType"]) ?? "hls",
                        videoSource:
                          movie.type === "series"
                            ? ((movie.videoType as Movie["videoType"]) ?? "hls")
                            : getDefaultVideoSource(
                                movie.videoUrl ?? "",
                                movie.videoType as Movie["videoType"]
                              ),
                        videoHeaders: movie.videoHeaders
                          ? JSON.stringify(movie.videoHeaders, null, 2)
                          : "",
                        thumbnail: movie.thumbnail ?? "",
                        poster: movie.poster ?? "",
                        type: movie.type ?? "single",
                        country: movie.country ?? "",
                        seriesStatus:
                          (movie.seriesStatus as FormState["seriesStatus"]) ??
                          ((movie.tags ?? []).find((t) =>
                            SERIES_STATUS_TAGS.includes(t as any)
                          ) as FormState["seriesStatus"]) ??
                          "",
                        episodes:
                          movie.episodes?.map((ep, idx) => ({
                            clientId: makeClientId(),
                            number: ep.number ?? idx + 1,
                            title: ep.title ?? `Tập ${idx + 1}`,
                            videoUrl: ep.videoUrl ?? "",
                            videoType:
                              (ep.videoType as Movie["videoType"]) ??
                              (movie.videoType as Movie["videoType"]) ??
                              "hls",
                            duration: ep.duration ?? "",
                          })) ?? [],
                      });
                    }}
                    className="mr-2 rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:border-primary hover:text-primary"
                  >
                    Sửa
                  </button>

                  <button
                    onClick={() => handleDelete(movie.id)}
                    className="rounded-full border border-red-400/40 px-3 py-1 text-red-300 hover:bg-red-500/10"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Ghi chú: Nút xoá đang gọi trực tiếp DELETE /movies/:id. Khi có xác thực
        admin thật, cần thêm JWT & logs.
      </p>

      {/* EDIT MODAL */}
      {editingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-dark/95 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-lg font-semibold text-white">
                  Chỉnh sửa phim: {editingMovie.title}
                </p>
                <p className="text-xs text-slate-400">
                  Cập nhật thông tin và lưu lại để đồng bộ danh sách.
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-primary hover:text-primary"
              >
                Đóng
              </button>
            </div>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!editingMovie) return;

                setSubmitting(true);
                setSubmitStatus(null);

                let parsedHeaders: Record<string, string> = {};
                try {
                  parsedHeaders = formData.videoHeaders
                    ? (JSON.parse(formData.videoHeaders) as Record<
                        string,
                        string
                      >)
                    : {};
                } catch {
                  setSubmitStatus("Headers JSON không hợp lệ.");
                  setSubmitting(false);
                  return;
                }

                try {
                  const resolvedVideoType =
                    formData.type === "series"
                      ? formData.videoType
                      : (formData.videoSource === "upload"
                          ? "mp4"
                          : formData.videoSource) as Movie["videoType"];

                  const episodes =
                    formData.type === "series"
                      ? formData.episodes
                          .map((ep, idx) => ({
                            number: ep.number || idx + 1,
                            title: ep.title || `Tập ${idx + 1}`,
                            videoUrl: ep.videoUrl,
                            videoType:
                              (ep.videoType as Movie["videoType"]) ??
                              (formData.videoType as Movie["videoType"]) ??
                              "hls",
                            duration: ep.duration,
                          }))
                          .filter((ep) => ep.videoUrl)
                      : [];

                  if (formData.type === "series" && episodes.length === 0) {
                    setSubmitStatus(
                      "Phim bộ cần ít nhất 1 tập với link video."
                    );
                    setSubmitting(false);
                    return;
                  }

                  // ✅ tags: remove status tags from manual input
                  const baseTags = formData.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .filter((tag) => !SERIES_STATUS_TAGS.includes(tag as any));

                  // ✅ add seriesStatus into tags for series (as UI says)
                  const tagList = [
                    ...baseTags,
                    ...(formData.type === "series" && formData.seriesStatus
                      ? [formData.seriesStatus]
                      : []),
                  ];

                  // ✅ year/rating no "||" bug when 0
                  const yearValue =
                    formData.year === ""
                      ? editingMovie.year
                      : Number(formData.year);

                  const ratingValue =
                    formData.rating === ""
                      ? editingMovie.rating
                      : Number(formData.rating);

                  await api.movies.update(editingMovie.id, {
                    title: formData.title,
                    synopsis: formData.synopsis,
                    year: Number.isFinite(yearValue as any)
                      ? yearValue
                      : editingMovie.year,
                    duration: formData.duration,
                    rating: Number.isFinite(ratingValue as any)
                      ? ratingValue
                      : editingMovie.rating,
                    tags: tagList,
                    moods: formData.moods
                      .split(",")
                      .map((mood) => mood.trim())
                      .filter(Boolean),
                    cast: formData.cast
                      .split(",")
                      .map((actor) => actor.trim())
                      .filter(Boolean),
                    director: formData.director,
                    trailerUrl: formData.trailerUrl,
                    videoUrl: formData.videoUrl,
                    videoType: resolvedVideoType,
                    videoHeaders: parsedHeaders,
                    thumbnail: formData.thumbnail,
                    poster: formData.poster,
                    type: formData.type,
                    country: formData.country,
                    seriesStatus:
                      formData.type === "series" ? formData.seriesStatus : "",
                    episodes,
                  });

                  await cleanupTempUploads(Object.values(tempUploadsRef.current));
                  setSubmitStatus("✔ Đã cập nhật phim thành công.");
                  setEditingMovie(null);
                  refetch();
                } catch (err) {
                  setSubmitStatus(
                    err instanceof Error
                      ? err.message
                      : "Không thể cập nhật phim."
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Tên phim
                  </label>
                  <input
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Đạo diễn
                  </label>
                  <input
                    value={formData.director}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        director: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Diễn viên (cách nhau bằng dấu phẩy)
                </label>
                <input
                  value={formData.cast}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      cast: event.target.value,
                    }))
                  }
                  placeholder="Nhập tên các diễn viên..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Năm
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        year: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Thời lượng
                  </label>
                  <input
                    value={formData.duration}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        duration: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        rating: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Loại phim
                </label>
                <select
                  value={formData.type}
                  onChange={(event) => {
                    const nextType = event.target.value as "single" | "series";
                    if (nextType === "series" && formData.videoSource === "upload") {
                      void handleVideoSourceChange("hls");
                    }
                    setFormData((prev) => ({
                      ...prev,
                      type: nextType,
                    }));
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="single">Phim lẻ</option>
                  <option value="series">Phim bộ</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Tags (cách nhau bởi dấu phẩy)
                  </label>
                  <input
                    value={formData.tags}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        tags: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Moods (cách nhau bởi dấu phẩy)
                  </label>
                  <input
                    value={formData.moods}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        moods: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={formData.synopsis}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      synopsis: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Link poster
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={formData.poster}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          poster: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
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
                      value={formData.thumbnail}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          thumbnail: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
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
                    Trailer URL
                  </label>
                  <input
                    value={formData.trailerUrl}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        trailerUrl: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Video URL
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={formData.videoUrl}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          videoUrl: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                      disabled={
                        formData.type === "series" ||
                        formData.videoSource === "upload"
                      }
                      readOnly={formData.videoSource === "upload"}
                      placeholder={
                        formData.type === "series"
                          ? "Phim bộ: điền link ở từng tập"
                          : formData.videoSource === "upload"
                          ? "Tải file video lên để lấy link"
                          : ""
                      }
                    />
                    {formData.type !== "series" &&
                      formData.videoSource === "upload" && (
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
                  {formData.type === "series" ? (
                    <select
                      value={formData.videoType}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          videoType: event.target.value as Movie["videoType"],
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="hls">HLS (.m3u8)</option>
                      <option value="mp4">MP4 trực tiếp</option>
                    </select>
                  ) : (
                    <select
                      value={formData.videoSource}
                      onChange={(event) =>
                        handleVideoSourceChange(
                          event.target.value as VideoSource
                        )
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

              {formData.type === "series" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">
                      Trạng thái phim bộ
                    </label>
                    <select
                      value={formData.seriesStatus}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          seriesStatus: event.target
                            .value as FormState["seriesStatus"],
                        }))
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

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Danh sách tập ({formData.episodes.length})
                      </p>
                      <p className="text-xs text-slate-400">
                        Thêm/xoá tập, mặc định tiêu đề sẽ là Tập + số thứ tự.
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

                  {formData.episodes.length === 0 && (
                    <p className="text-xs text-slate-400">
                      Chưa có tập nào. Bấm &quot;+ Thêm tập&quot; để bắt đầu.
                    </p>
                  )}

                  <div className="space-y-3">
                    {formData.episodes.map((ep, index) => (
                      <div
                        key={ep.clientId} // ✅ stable
                        className="grid gap-3 rounded-xl border border-white/10 bg-dark/60 p-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto]"
                      >
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-500">
                            Tiêu đề tập
                          </label>
                          <input
                            value={ep.title}
                            onChange={(event) =>
                              updateEpisodeField(
                                index,
                                "title",
                                event.target.value
                              )
                            }
                            placeholder={`Tập ${ep.number || index + 1}`}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-500">
                            Link video
                          </label>
                          <input
                            value={ep.videoUrl}
                            onChange={(event) =>
                              updateEpisodeField(
                                index,
                                "videoUrl",
                                event.target.value
                              )
                            }
                            placeholder="https://..."
                            className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                          />
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
                            value={ep.videoType || formData.videoType || "hls"}
                            onChange={(event) =>
                              updateEpisodeField(
                                index,
                                "videoType",
                                event.target.value as Movie["videoType"]
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-dark/60 px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="hls">HLS</option>
                            <option value="mp4">MP4</option>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Quốc gia (không bắt buộc)
                </label>
                <input
                  type="text"
                  list="country-options"
                  value={formData.country}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  placeholder="Nhập hoặc chọn nhanh..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <datalist id="country-options">
                  {countryOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>

              {submitStatus && (
                <p
                  className={`text-sm ${
                    submitStatus.startsWith("✔")
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {submitStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* HIDE / UNHIDE DIALOG */}
      {hideDialogMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-dark/95 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {hideDialogMovie.isHidden ? "Hiện phim" : "Ẩn phim"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {hideDialogMovie.isHidden
                ? `Phim "${hideDialogMovie.title}" sẽ hiện lại ngay lập tức và người dùng có thể xem được.`
                : `Phim "${hideDialogMovie.title}" sẽ bị ẩn khỏi danh sách công khai.`}
            </p>

            {!hideDialogMovie.isHidden && (
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Ngày mở lại (tùy chọn)
                </label>
                <input
                  type="datetime-local"
                  value={unhideDate}
                  onChange={(e) => setUnhideDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Nếu để trống, phim sẽ ẩn vô thời hạn cho đến khi bạn thủ công
                  bật lại.
                </p>
              </div>
            )}

            {hideDialogMovie.isHidden && hideDialogMovie.unhideDate && (
              <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="text-xs text-yellow-300">
                  ℹ️ Phim này đã được lên lịch mở lại tự động vào:{" "}
                  <strong>
                    {new Date(hideDialogMovie.unhideDate).toLocaleString(
                      "vi-VN"
                    )}
                  </strong>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Bấm "Xác nhận" để hủy lịch và hiện phim ngay bây giờ.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setHideDialogMovie(null);
                  setUnhideDate("");
                }}
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary"
              >
                Hủy
              </button>
              <button
                onClick={() => handleToggleVisibility(hideDialogMovie)}
                className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-primary/90"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
