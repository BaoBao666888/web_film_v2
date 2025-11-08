import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";

export function AdminAddMoviePage() {
  const [form, setForm] = useState({
    title: "",
    director: "",
    year: new Date().getFullYear(),
    duration: "1h 55m",
    rating: 4.5,
    tags: "Hành động, Sci-fi",
    synopsis: "",
    poster:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=900&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80",
    trailerUrl: "",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.movies.create({
        ...form,
        tags: form.tags.split(",").map((item) => item.trim()),
        moods: ["Hành động", "Khoa học viễn tưởng"],
        cast: ["Đang cập nhật"],
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
        description="Form nhập liệu chi tiết để đẩy phim lên hệ thống. Submit sẽ gọi API POST /movies."
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Tên phim
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

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Năm sản xuất
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
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Thời lượng
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
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Rating
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
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Link poster
            </label>
            <input
              type="url"
              value={form.poster}
              onChange={(event) => updateField("poster", event.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Đang lưu..." : "Lưu phim"}
        </button>
        {status && (
          <p className="text-xs text-emerald-400">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
