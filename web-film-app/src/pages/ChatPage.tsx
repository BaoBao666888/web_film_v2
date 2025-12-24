import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { chatbotExamples } from "../data/movies";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import type { ChatSuggestion } from "../types/api";

const assistantMessages = [
  {
    title: "Tính năng sắp triển khai",
    detail:
      "Chatbot được tối ưu để hiểu câu hỏi tiếng Việt tự nhiên và trả về đề xuất phim tức thì.",
  },
  {
    title: "Thông minh hơn theo thời gian",
    detail:
      "Sau mỗi phiên trò chuyện, hệ thống log dữ liệu đã ẩn danh để cải thiện mô hình gợi ý.",
  },
];

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

const initialMessages: ConversationMessage[] = chatbotExamples.flatMap(
  (example) => [
    { role: "user", text: example.user },
    { role: "assistant", text: example.ai },
  ]
);

export function ChatPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);

  const handleReset = () => {
    setMessages(initialMessages);
    setSuggestions([]);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    const question = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    setError(null);
    try {
      const response = await api.ai.chat({ message: question });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: response.reply },
      ]);
      setSuggestions(response.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chatbot lỗi, thử lại sau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Chatbot AI phim"
        description="Trò chuyện với trợ lý ảo để nhận gợi ý dựa trên mood, thể loại yêu thích, hoặc tình huống cụ thể."
      />

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-dark/70 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Lumi – Trợ lý phim của bạn
              </p>
              <p className="text-xs text-slate-400">
                Đặt câu hỏi càng cụ thể, gợi ý càng sát gu bạn.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-primary hover:text-primary"
            >
              Reset chat
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm ${
                    message.role === "user"
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary/20 text-secondary"
                  }`}
                >
                  {message.role === "user" ? "Bạn" : "AI"}
                </div>
                <div
                  className={`max-w-lg rounded-2xl p-4 text-sm text-slate-100 ${
                    message.role === "user" ? "bg-white/10" : "bg-secondary/10"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-400">AI đang suy nghĩ…</p>
            )}
            {error && <p className="text-xs text-red-400">Lỗi: {error}</p>}
          </div>

          <div className="border-t border-white/10 bg-dark/80 p-4">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-full border border-white/10 bg-dark/60 p-2"
            >
              <textarea
                rows={1}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Nhập câu hỏi — ví dụ: 'Mình muốn xem phim kinh dị nhưng không quá ghê...' "
                className="h-10 flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90 disabled:opacity-60"
              >
                Gửi
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Gợi ý luôn có thể cải thiện nếu bạn mô tả thêm về mood hoặc thể loại.
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
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white">
                Gợi ý từ chatbot
              </p>
              <div className="mt-3 space-y-3">
                {suggestions.map((item) => (
                  <Link
                    key={item.id}
                    to={`/movie/${item.id}`}
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
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {item.synopsis}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
