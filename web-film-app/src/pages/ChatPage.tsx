import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import type { ChatSuggestion } from "../types/api";

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

const initialMessages: ConversationMessage[] = [];

const MOVIE_LINK_REGEX = /(^|[\s(])(\/movie\/[a-z0-9-]+)(?=\s|[).,!?]|$)/gi;

const linkifyMoviePaths = (text: string) =>
  text.replace(MOVIE_LINK_REGEX, (match, prefix, path, offset) => {
    if (prefix === "(" && offset > 0 && text[offset - 1] === "]") {
      return match;
    }
    return `${prefix}[${path}](${path})`;
  });

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: ({ children, href }) => {
    const className = "text-primary underline underline-offset-2";
    if (href && href.startsWith("/")) {
      return (
        <Link to={href} className={className} target="_blank" rel="noreferrer">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-white/10 p-3 text-xs">
      {children}
    </pre>
  ),
};

const quickPrompts = [
  "Gợi ý phim gia đình nhẹ nhàng để xem buổi tối.",
  "Mình muốn phim lãng mạn nhưng không quá sướt mướt.",
  "Có phim nào hài mà vẫn ấm áp không?",
  "Tóm tắt nội dung tập 1 cho mình.",
];

const SESSION_KEY = "chatbot_session_id";

const getSessionId = () => {
  if (typeof window === "undefined") return "anonymous";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    const rand = Math.random().toString(36).slice(2, 8);
    sessionId = `guest-${Date.now().toString(36)}-${rand}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

export function ChatPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleReset = () => {
    setMessages([]);
    setSuggestions([]);
    setError(null);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
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
      const response = await api.ai.chatbot({
        message: question,
        sessionId: getSessionId(),
      });
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

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="chat-shell flex h-[560px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-dark/80 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Lumi – Trợ lý phim của bạn
              </p>
              <p className="text-xs text-slate-400">
                Đặt câu hỏi càng cụ thể, gợi ý càng sát gu bạn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="chat-status rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-200">
                Online
              </span>
              <button
                onClick={handleReset}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-primary hover:text-primary"
              >
                Reset chat
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-dark/50 p-6 text-sm text-slate-300">
                <p className="text-base font-semibold text-white">
                  Lumi luôn sẵn sàng gợi ý phim đúng mood.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Hỏi về thể loại, cảm xúc, diễn viên hoặc nhờ tóm tắt tập phim để bắt đầu.
                </p>
              </div>
            )}
            {messages.map((message, index) => {
              const displayText =
                message.role === "assistant"
                  ? linkifyMoviePaths(message.text)
                  : message.text;
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[80%] items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                        message.role === "user"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary/20 text-secondary"
                      }`}
                    >
                      {message.role === "user" ? "Bạn" : "AI"}
                    </div>
                    <div
                      className={`chat-bubble rounded-2xl border px-4 py-3 text-sm text-white shadow-lg shadow-black/10 ${
                        message.role === "user"
                          ? "chat-bubble-user border-primary/30 bg-primary/15"
                          : "chat-bubble-ai border-white/10 bg-dark/60"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {displayText}
                        </ReactMarkdown>
                      ) : (
                        displayText
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" />
                AI đang suy nghĩ…
              </div>
            )}
            {error && <p className="text-xs text-red-400">Lỗi: {error}</p>}
          </div>

          <div className="border-t border-white/10 bg-dark/80 p-4">
            <form
              onSubmit={handleSubmit}
              className="chat-input flex items-center gap-3 rounded-2xl border border-white/10 bg-dark/60 p-2"
            >
              <textarea
                rows={1}
                ref={inputRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Nhập câu hỏi — ví dụ: 'Mình muốn xem phim kinh dị nhưng không quá ghê...' "
                className="h-10 flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90 disabled:opacity-60"
              >
                Gửi
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Gợi ý luôn có thể cải thiện nếu bạn mô tả thêm về mood hoặc thể loại.
            </p>
          </div>
        </div>

        <aside className="chat-aside space-y-6 rounded-3xl border border-white/10 bg-dark/50 p-6 shadow-xl shadow-black/25">
          <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
            <p className="text-sm font-semibold text-white">Mẹo hỏi nhanh</p>
            <p className="mt-2 text-xs text-slate-400">
              Chạm để điền nhanh vào ô chat, bạn có thể chỉnh lại cho phù hợp.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="chat-quick rounded-full border border-white/10 bg-dark/70 px-3 py-1 text-xs text-slate-200 transition hover:border-primary hover:text-primary"
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
          {suggestions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-dark/40 p-4 text-xs text-slate-400">
              Chưa có gợi ý phim. Hãy đặt câu hỏi để Lumi đề xuất nhé.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
