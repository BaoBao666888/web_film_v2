import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import type { WatchResponse } from "../types/api";
import { PageHeader } from "../components/PageHeader";

export function WatchPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<WatchResponse>(
    id ? `/movies/${id}/watch` : null,
    [id]
  );

  const nextList = useMemo(() => data?.nextUp ?? [], [data]);

  if (loading) {
    return <p>Đang tải dữ liệu phát…</p>;
  }

  if (error) {
    return <p className="text-red-400">Không tải được: {error}</p>;
  }

  if (!data) {
    return <p>Không tìm thấy nội dung cần phát.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Đang phát: ${data.title}`}
        description={data.synopsis}
        actions={
          data.trailerUrl && (
            <a
              href={data.trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Xem trailer
            </a>
          )
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-4 shadow-xl shadow-black/40">
          <video
            key={data.videoUrl}
            className="w-full rounded-3xl border border-white/5"
            controls
            poster={data.poster}
          >
            <source src={data.videoUrl} type="video/mp4" />
            Trình duyệt không hỗ trợ video.
          </video>
          <p className="mt-3 text-xs text-slate-400">
            Nguồn video mẫu dùng để demo giao diện. API thực tế sẽ trả về link
            bảo vệ DRM hoặc HLS.
          </p>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25">
          <p className="text-sm font-semibold text-white">Tiếp theo</p>
          <div className="flex flex-col gap-4">
            {nextList.map((item) => (
              <Link
                key={item.id}
                to={`/watch/${item.id}`}
                className="flex gap-3 rounded-2xl border border-white/10 bg-dark/60 p-3 transition hover:border-primary"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">{item.duration}</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
