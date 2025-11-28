import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminMoviesResponse, Episode, Movie } from "../../types/api";
import { api } from "../../lib/api";

type EpisodeInput = Episode & {
  videoUrl: string;
  videoType: Movie["videoType"];
};

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
  videoHeaders: string;
  thumbnail: string;
  poster: string;
  type: "single" | "series";
  episodes: EpisodeInput[];
  country: string;
};

export function AdminManagePage() {
  const { data, loading, error, refetch } =
    useFetch<AdminMoviesResponse>("/admin/movies");
  const movies = data?.movies ?? [];
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
    videoType: "hls",
    videoHeaders: "",
    thumbnail: "",
    poster: "",
    type: "single",
    episodes: [],
    country: "",
  });
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);

  useEffect(() => {
    let didLoad = false;
    fetch("/countries.json")
      .then((res) => res.json())
      .then((list: Array<{ name?: string } | string>) => {
        if (didLoad) return;
        const names = (list || [])
          .map((item) =>
            typeof item === "string"
              ? item.trim()
              : (item?.name || "").trim()
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

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xoá phim này?")) return;
    await api.movies.delete(id);
    refetch();
  };

  const addEpisodeRow = () => {
    setFormData((prev) => {
      const nextNumber = (prev.episodes?.length || 0) + 1;
      return {
        ...prev,
        episodes: [
          ...(prev.episodes || []),
          {
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
          return {
            ...ep,
            videoType: (value || "hls") as Movie["videoType"],
          };
        }
        return { ...ep, [key]: value ?? "" };
      }),
    }));
  };

  const removeEpisode = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      episodes: prev.episodes.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Quản lý phim"
        description="Danh sách phim hiện có. Dữ liệu lấy từ API admin/movies."
        actions={
          <Link
            to="/admin/add-movie"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
          >
            + Thêm phim
          </Link>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-black/30">
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
            {movies.map((movie) => (
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
                      <p className="font-semibold text-white">{movie.title}</p>
                      <p className="text-xs text-slate-400">
                        ID: {movie.id.toUpperCase()}
                      </p>
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
                  {movie.rating?.toFixed(1)}
                </td>
                <td className="px-6 py-4 text-right text-xs">
                  <button
                    onClick={() => {
                      setEditingMovie(movie);
                      setSubmitStatus(null);
                      setFormData({
                        title: movie.title ?? "",
                        synopsis: movie.synopsis ?? "",
                        year: String(movie.year ?? ""),
                        duration: movie.duration ?? "",
                        rating: movie.rating ? String(movie.rating) : "",
                        tags: movie.tags?.join(", ") ?? "",
                        moods: movie.moods?.join(", ") ?? "",
                        cast: movie.cast?.join(", ") ?? "",
                        director: movie.director ?? "",
                        trailerUrl: movie.trailerUrl ?? "",
                        videoUrl: movie.videoUrl ?? "",
                        videoType:
                          (movie.videoType as Movie["videoType"]) ?? "hls",
                        videoHeaders: movie.videoHeaders
                          ? JSON.stringify(movie.videoHeaders, null, 2)
                          : "",
                        thumbnail: movie.thumbnail ?? "",
                        poster: movie.poster ?? "",
                        type: movie.type ?? "single",
                        country: movie.country ?? "",
                        episodes:
                          movie.episodes?.map((ep, idx) => ({
                            number: ep.number ?? idx + 1,
                            title: ep.title ?? `Tập ${idx + 1}`,
                            videoUrl: ep.videoUrl ?? "",
                            videoType:
                              (ep.videoType as Movie["videoType"]) ??
                              ((movie.videoType as Movie["videoType"]) ??
                                "hls"),
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
                onClick={() => {
                  setEditingMovie(null);
                  setSubmitStatus(null);
                }}
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
                    ? (JSON.parse(
                        formData.videoHeaders
                      ) as Record<string, string>)
                    : {};
                } catch (err) {
                  setSubmitStatus("Headers JSON không hợp lệ.");
                  setSubmitting(false);
                  return;
                }

                try {
                  await api.movies.update(editingMovie.id, {
                    title: formData.title,
                    synopsis: formData.synopsis,
                    year: Number(formData.year) || editingMovie.year,
                    duration: formData.duration,
                    rating: Number(formData.rating) || editingMovie.rating,
                    tags: formData.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
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
                    videoType: formData.videoType as Movie["videoType"],
                    videoHeaders: parsedHeaders,
                    thumbnail: formData.thumbnail,
                    poster: formData.poster,
                    type: formData.type,
                    country: formData.country,
                    episodes:
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
                        : [],
                  });
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
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: event.target.value as "single" | "series",
                    }))
                  }
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
                  <input
                    value={formData.poster}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        poster: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Link thumbnail
                  </label>
                  <input
                    value={formData.thumbnail}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        thumbnail: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
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
                  <input
                    value={formData.videoUrl}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        videoUrl: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Định dạng nguồn
                  </label>
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
                </div>
              </div>

              {formData.type === "series" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
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
                        key={`edit-ep-${ep.number}-${index}`}
                        className="grid gap-3 rounded-xl border border-white/10 bg-dark/60 p-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto]"
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
                          <input
                            value={ep.videoUrl}
                            onChange={(event) =>
                              updateEpisodeField(index, "videoUrl", event.target.value)
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
                              updateEpisodeField(index, "duration", event.target.value)
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

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Headers (JSON) để vượt qua Referer/Origin
                </label>
                <textarea
                  rows={3}
                  value={formData.videoHeaders}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      videoHeaders: event.target.value,
                    }))
                  }
                  placeholder='{"Referer":"https://rophim.net/"}'
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Copy trực tiếp headers lấy từ note Rophim hoặc các tool khác
                  để player phía client có thể gọi qua proxy bảo mật.
                </p>
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
    </div>
  );
}
