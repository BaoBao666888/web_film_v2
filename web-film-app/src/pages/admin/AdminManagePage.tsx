import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminMoviesResponse } from "../../types/api";
import { api } from "../../lib/api";

export function AdminManagePage() {
  const { data, loading, error, refetch } =
    useFetch<AdminMoviesResponse>("/admin/movies");
  const movies = data?.movies ?? [];

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
                <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
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
                <td className="px-6 py-4 text-xs text-slate-300">{movie.year}</td>
                <td className="px-6 py-4 text-xs text-slate-300">
                  {movie.rating?.toFixed(1)}
                </td>
                <td className="px-6 py-4 text-right text-xs">
                  <button className="mr-2 rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:border-primary hover:text-primary">
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
    </div>
  );
}
