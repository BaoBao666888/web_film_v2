import { chatbotExamples } from "../data/movies";
import { PageHeader } from "../components/PageHeader";

const assistantMessages = [
  {
    title: "Tính năng sắp triển khai",
    detail:
      "Chatbot kết nối API NLP (Azure / OpenAI) để hiểu câu hỏi tiếng Việt tự nhiên và trả về đề xuất phim tức thì.",
  },
  {
    title: "Thông minh hơn theo thời gian",
    detail:
      "Sau mỗi phiên trò chuyện, hệ thống log dữ liệu đã ẩn danh để cải thiện mô hình gợi ý.",
  },
];

export function ChatPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Chatbot AI phim"
        description="Trò chuyện với trợ lý ảo để nhận gợi ý dựa trên mood, thể loại yêu thích, hoặc tình huống cụ thể. UI hoàn chỉnh cho luồng chat; backend sẽ nối sau."
      />

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-dark/70 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Lumi – Trợ lý phim của bạn
              </p>
              <p className="text-xs text-slate-400">
                Phiên chat demo, dữ liệu đang mô phỏng.
              </p>
            </div>
            <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-primary hover:text-primary">
              Reset chat
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {chatbotExamples.map((example, index) => (
              <div key={example.user} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/20 text-sm text-primary">
                    Bạn
                  </div>
                  <div className="max-w-lg rounded-2xl bg-white/10 p-4 text-sm text-slate-100">
                    {example.user}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-secondary/20 text-sm text-secondary">
                    AI
                  </div>
                  <div className="max-w-lg rounded-2xl bg-secondary/10 p-4 text-sm text-slate-100">
                    {example.ai}
                  </div>
                </div>
                {index === chatbotExamples.length - 1 && (
                  <p className="text-xs text-slate-500">
                    Chatbot sẽ dùng cùng tone giao tiếp thân thiện như trên.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 bg-dark/80 p-4">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-dark/60 p-2">
              <textarea
                rows={1}
                placeholder="Nhập câu hỏi — ví dụ: 'Mình muốn xem phim kinh dị nhưng không quá ghê...' "
                className="h-10 flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90">
                Gửi
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Ghi chú: Sẽ kết nối WebSocket để nhận phản hồi realtime.
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">Roadmap chatbot</p>
          <ul className="space-y-3 text-xs text-slate-300">
            {assistantMessages.map((message) => (
              <li
                key={message.title}
                className="rounded-2xl border border-white/10 bg-dark/60 p-4"
              >
                <p className="text-sm font-semibold text-white">
                  {message.title}
                </p>
                <p className="mt-2">{message.detail}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs text-slate-200">
            <p className="font-semibold text-white">Tích hợp kế tiếp</p>
            <p className="mt-2">
              - Đồng bộ với recommendation engine để gửi lệnh “Save to playlist”.
            </p>
            <p className="mt-1">- Gắn tracking đánh giá chất lượng gợi ý.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
