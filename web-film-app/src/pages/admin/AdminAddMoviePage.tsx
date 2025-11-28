import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import type { Episode, Movie } from "../../types/api";

type EpisodeInput = Episode & {
  videoUrl: string;
  videoType: Movie["videoType"];
};

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
  videoHeaders: string;
  type: "single" | "series";
  episodes: EpisodeInput[];
  country: string;
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
    videoType: "hls",
    videoHeaders: "",
    type: "single",
    episodes: [],
    country: "",
  });

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const updateField = (key: keyof FormState, value: string | number) => {
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
        return { ...ep, [key]: value ?? "" };
      }),
    }));
  };

  const removeEpisode = (index: number) => {
    setForm((prev) => ({
      ...prev,
      episodes: prev.episodes.filter((_, idx) => idx !== index),
    }));
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
      setStatus("Headers JSON không hợp lệ. Kiểm tra lại cú pháp.");
      setLoading(false);
      return;
    }

    try {
      const episodes =
        form.type === "series"
          ? form.episodes
              .map((ep, idx) => ({
                number: ep.number || idx + 1,
                title: ep.title || `Tập ${idx + 1}`,
                videoUrl: ep.videoUrl,
                videoType:
                  (ep.videoType as Movie["videoType"]) ??
                  (form.videoType as Movie["videoType"]) ??
                  "hls",
                duration: ep.duration,
              }))
              .filter((ep) => ep.videoUrl)
          : [];

      if (form.type === "series" && episodes.length === 0) {
        setStatus("Phim bộ cần ít nhất 1 tập với link video.");
        setLoading(false);
        return;
      }

      const tagList = form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (form.type === "series" && form.seriesStatus) {
        tagList.push(form.seriesStatus);
      }

      await api.movies.create({
        ...form,
        type: form.type,
        country: form.country,
        seriesStatus: form.type === "series" ? form.seriesStatus : "",
        tags: tagList,
        moods: ["Hành động", "Khoa học viễn tưởng"],
        cast: form.cast
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        videoHeaders: parsedHeaders,
        episodes,
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
            onChange={(event) =>
              updateField("type", event.target.value as "single" | "series")
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="single">Phim lẻ</option>
            <option value="series">Phim bộ</option>
          </select>
        </div>

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

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Link poster <span className="text-red-400">*</span>
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
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Link thumbnail <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(event) => updateField("thumbnail", event.target.value)}
              placeholder="https://.../thumbnail.jpg"
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

          <div>
            <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              Link phim (video) <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={form.videoUrl}
              onChange={(event) => updateField("videoUrl", event.target.value)}
              placeholder="https://.../playlist.m3u8"
              disabled={form.type === "series"}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Định dạng nguồn
            </label>
            <select
              value={form.videoType}
              onChange={(event) => updateField("videoType", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="hls">HLS (.m3u8)</option>
              <option value="mp4">MP4 trực tiếp</option>
            </select>
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
                <p className="text-sm font-semibold text-white">Danh sách tập</p>
                <p className="text-xs text-slate-400">
                  Điền link và tiêu đề, mặc định tiêu đề sẽ là “Tập + số thứ tự”.
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
                Chưa có tập nào. Bấm &quot;+ Thêm tập&quot; để bắt đầu với Tập 1.
              </p>
            )}

            <div className="space-y-3">
              {form.episodes.map((ep, index) => (
                <div
                  key={`ep-${ep.number}-${index}`}
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto]"
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
                      value={ep.videoType || form.videoType || "hls"}
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
            Headers (JSON) cho nguồn được bảo vệ
          </label>
          <textarea
            rows={3}
            value={form.videoHeaders}
            onChange={(event) => updateField("videoHeaders", event.target.value)}
            placeholder='{"Referer":"https://example.com/"} (bỏ trống để dùng header mặc định)'
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <p className="mt-2 text-xs text-slate-400">
            Nếu để trống, hệ thống sẽ tự áp dụng bộ headers mặc định (Referer
            https://goatembed.com/ + user-agent chuẩn). Điền JSON khi cần override
            riêng cho phim.
          </p>
        </div>

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
