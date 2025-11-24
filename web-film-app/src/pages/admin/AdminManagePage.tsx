import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminMoviesResponse, Movie } from "../../types/api";
import { api } from "../../lib/api";

export function AdminManagePage() {
  const { data, loading, error, refetch } =
    useFetch<AdminMoviesResponse>("/admin/movies");
  const movies = data?.movies ?? [];
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState({
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
    thumbnail: "",
    poster: "",
  });
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xoá phim này?")) return;
    await api.movies.delete(id);
    refetch();
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
              <th className="px-6 py-4">Thể loại</th>
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
                  {movie.tags?.join(", ")}
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
                        thumbnail: movie.thumbnail ?? "",
                        poster: movie.poster ?? "",
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
                    thumbnail: formData.thumbnail,
                    poster: formData.poster,
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
