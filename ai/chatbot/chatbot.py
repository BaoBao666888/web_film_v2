import os
import re
import json
import unicodedata
import pymongo
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv
from bson import ObjectId
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import fuzz

# --- CẤU HÌNH ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))
load_dotenv(os.path.join(BASE_DIR, "..", "..", ".env"))

MONGO_URI = "mongodb://localhost:27017/"
client = pymongo.MongoClient(MONGO_URI)
db = client["lumi_ai"]
vectors_col = db["video_vectors"]
movies_col = db["movies"]
movie_embeddings_col = db["movie_embeddings"]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# GEMINI_API_KEY = "AIzaSyDQc-uamu1BDViYtkSstuaxQg5CQzz3Yo0"
genai.configure(api_key=GEMINI_API_KEY)

print("⏳ Đang load Model Embedding...")
embedder = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')

generation_config = {
  "temperature": 0.5,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 8192,
}
model = genai.GenerativeModel(model_name="gemini-2.5-flash", generation_config=generation_config)

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
LLAMA_MODEL_PATH = os.getenv("LLAMA_MODEL_PATH", "").strip()
LLAMA_N_CTX = int(os.getenv("LLAMA_N_CTX", "2048"))
LLAMA_N_THREADS = int(os.getenv("LLAMA_N_THREADS", str(os.cpu_count() or 4)))
LLAMA_MAX_TOKENS = int(os.getenv("LLAMA_MAX_TOKENS", "1024"))
LLAMA_TEMPERATURE = float(os.getenv("LLAMA_TEMPERATURE", "0.5"))
_LLAMA_INSTANCE = None
print(f"[LLM] provider={LLM_PROVIDER}")
if LLM_PROVIDER == "llama_cpp":
    print(f"[LLM] model_path={LLAMA_MODEL_PATH or 'missing'}")
else:
    print("[LLM] model=gemini-2.5-flash")

EP_PATTERNS = [
    r"(?:tập|tap|ep|episode)\s*(\d+)",
    r"(?:tập|tap)\s*thứ\s*(\d+)",
]
MOVIE_MATCH_THRESHOLD = 0.35
FUZZY_MATCH_THRESHOLD = 75
FUZZY_AMBIGUOUS_DELTA = 6
LAST_CLARIFICATION = None
LAST_USER_QUESTION = None
TOOL_MAX_STEPS = 9
SESSION_MEMORY = {}
SESSION_SUMMARY_MAX = 220
SESSION_TURN_MAX = 180
SUMMARY_KEYWORDS = [
    "tóm tắt",
    "nội dung tập",
    "kể lại tập",
    "tập này nói về gì",
    "review tập",
]

def _get_llama():
    global _LLAMA_INSTANCE
    if _LLAMA_INSTANCE is not None:
        return _LLAMA_INSTANCE
    if not LLAMA_MODEL_PATH:
        raise RuntimeError("Missing LLAMA_MODEL_PATH")
    from llama_cpp import Llama
    _LLAMA_INSTANCE = Llama(
        model_path=LLAMA_MODEL_PATH,
        n_ctx=LLAMA_N_CTX,
        n_threads=LLAMA_N_THREADS,
    )
    return _LLAMA_INSTANCE

def _llama_token_count(llm, text):
    try:
        return len(llm.tokenize(text.encode("utf-8")))
    except Exception:
        return None

def _llama_max_tokens_for_prompt(llm, prompt, reserve_tokens=128):
    token_count = _llama_token_count(llm, prompt)
    if token_count is None:
        return LLAMA_MAX_TOKENS
    available = LLAMA_N_CTX - token_count - reserve_tokens
    if available <= 0:
        return 0
    return min(LLAMA_MAX_TOKENS, available)

def _generate_text(prompt):
    if LLM_PROVIDER == "llama_cpp":
        llm = _get_llama()
        max_tokens = _llama_max_tokens_for_prompt(llm, prompt)
        if max_tokens <= 0:
            prompt = _truncate_text(prompt, max_chars=max(400, int(len(prompt) * 0.6)))
            max_tokens = _llama_max_tokens_for_prompt(llm, prompt, reserve_tokens=32)
        if max_tokens <= 0:
            raise RuntimeError("Prompt too long for llama context window")
        result = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=LLAMA_TEMPERATURE,
            max_tokens=max_tokens,
        )
        return result["choices"][0]["message"]["content"]
    response = model.generate_content(prompt)
    return response.text

def _try_generate_text(prompt, label):
    try:
        return _generate_text(prompt)
    except Exception as exc:
        print(f"[LLM] {label} failed: {exc}")
        return None

def _maybe_preload_llama():
    if LLM_PROVIDER != "llama_cpp":
        return
    if not LLAMA_MODEL_PATH:
        print("[LLM] missing LLAMA_MODEL_PATH, skip preload")
        return
    try:
        print("[LLM] preloading llama model...")
        _get_llama()
        print("[LLM] preload done")
    except Exception as exc:
        print(f"[LLM] preload failed: {exc}")

_maybe_preload_llama()

# --- HÀM TÌM KIẾM VECTOR (GIỮ NGUYÊN) ---
def search_knowledge_base(user_query, top_k=5, movie_id=None):
    query_vector = embedder.encode(user_query).reshape(1, -1)
    
    filter_query = {}
    if movie_id:
        filter_query = {"movie_id": movie_id}
    
    cursor = vectors_col.find(filter_query, {"vector_embedding": 1, "content": 1, "start": 1, "episode": 1})
    data_points = list(cursor)

    if not data_points: return []

    db_vectors = np.array([d["vector_embedding"] for d in data_points])
    similarities = cosine_similarity(query_vector, db_vectors)[0]
    
    top_indices = similarities.argsort()[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        item = data_points[idx]
        item['score'] = similarities[idx]
        results.append(item)
    return results

def _safe_json_load(text):
    if not text:
        return None
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None

def _truncate_text(text, max_chars=2000):
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."

def _normalize_session_id(value):
    if not value:
        return "anonymous"
    value = str(value).strip()
    if not value:
        return "anonymous"
    return value[:64]

def _is_summary_request(text):
    if not text:
        return False
    lower = text.lower()
    return any(keyword in lower for keyword in SUMMARY_KEYWORDS)

def _decide_summary_mode(text):
    if not text:
        return False
    if LLM_PROVIDER != "llama_cpp":
        return _is_summary_request(text)
    prompt = f"""
Hãy phân loại yêu cầu dưới đây.
- Trả lời "summary" nếu người dùng muốn tóm tắt/kể lại nội dung.
- Trả lời "detail" nếu không phải yêu cầu tóm tắt.
Chỉ trả đúng một từ: summary hoặc detail.

Yêu cầu: "{text}"
""".strip()
    decision = (_try_generate_text(prompt, "summary_decider") or "").strip().lower()
    if "summary" in decision:
        return True
    if "detail" in decision:
        return False
    return _is_summary_request(text)

def _get_session_context(session_id):
    state = SESSION_MEMORY.get(session_id)
    if not state:
        return ""
    summary = _truncate_text(state.get("summary", ""), SESSION_SUMMARY_MAX)
    last_user = _truncate_text(state.get("last_user", ""), SESSION_TURN_MAX)
    last_assistant = _truncate_text(state.get("last_assistant", ""), SESSION_TURN_MAX)
    if not (summary or last_user or last_assistant):
        return ""
    lines = []
    if summary:
        lines.append(f"Tóm tắt ngắn: {summary}")
    if last_user or last_assistant:
        lines.append(f"Lượt trước: U: {last_user} | A: {last_assistant}")
    return "\n".join(lines)

def _update_session_memory(session_id, user_question, assistant_answer):
    state = SESSION_MEMORY.get(session_id, {})
    summary = state.get("summary", "")
    snippet = _truncate_text(user_question, SESSION_SUMMARY_MAX)
    if summary:
        summary = f"{summary} | {snippet}"
    else:
        summary = snippet
    summary = _truncate_text(summary, SESSION_SUMMARY_MAX)
    state["summary"] = summary
    state["last_user"] = _truncate_text(user_question, SESSION_TURN_MAX)
    state["last_assistant"] = _truncate_text(assistant_answer, SESSION_TURN_MAX)
    SESSION_MEMORY[session_id] = state

def _parse_object_id(value):
    if not value:
        return None
    try:
        return ObjectId(str(value))
    except Exception:
        return None

def _movie_link(movie):
    movie_id = movie.get("id") or movie.get("slug")
    if not movie_id:
        return None
    return f"/movie/{str(movie_id).lower()}"

def _resolve_movie(movie_id=None, slug=None, movie_code=None):
    if movie_id:
        obj_id = _parse_object_id(movie_id)
        if obj_id:
            movie = movies_col.find_one({"_id": obj_id})
            if movie:
                return movie
        # Nếu movie_id không phải ObjectId thì thử coi như slug hoặc id.
        movie = movies_col.find_one({"slug": str(movie_id)})
        if movie:
            return movie
        movie = movies_col.find_one({"id": str(movie_id)})
        if movie:
            return movie
    if slug:
        movie = movies_col.find_one({"slug": slug})
        if movie:
            return movie
    if movie_code:
        movie = movies_col.find_one({"id": movie_code})
        if movie:
            return movie
    return None

def _movie_brief(movie, score=None):
    if not movie:
        return None
    payload = {
        "id": movie.get("id"),
        "slug": movie.get("slug"),
        "title": movie.get("title"),
        "year": movie.get("year"),
        "type": movie.get("type"),
    }
    link = _movie_link(movie)
    if link:
        payload["link"] = link
    if score is not None:
        payload["score"] = float(score)
    return payload

def _slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text

def _detect_episode(text):
    text = text.lower()
    for pattern in EP_PATTERNS:
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
    return None

def _find_movie_by_text(user_question):
    docs = list(movie_embeddings_col.find({}, {"movie_id": 1, "title": 1, "vector_embedding": 1}))
    if not docs:
        print("⚠️ Chưa có movie embeddings. Hãy chạy sync_db.py để tạo.")
        return None

    query_vector = embedder.encode(user_question).reshape(1, -1)
    db_vectors = np.array([d["vector_embedding"] for d in docs])
    similarities = cosine_similarity(query_vector, db_vectors)[0]
    top_idx = similarities.argmax()
    best = docs[top_idx]
    score = similarities[top_idx]

    if score < MOVIE_MATCH_THRESHOLD:
        print(f"⚠️ Độ khớp phim thấp ({score:.2f})")
        return None

    print(f"🎯 Nhận diện phim từ mô tả: {best.get('title')} (score={score:.2f})")
    return movies_col.find_one({"_id": best["movie_id"]})

def _fuzzy_score(question_slug, question_lower, movie):
    slug = movie.get("slug", "")
    title = movie.get("title", "")
    title_slug = _slugify(title) if title else ""

    scores = []
    if slug:
        scores.append(fuzz.partial_ratio(question_slug, slug))
        scores.append(fuzz.token_set_ratio(question_slug, slug))
    if title_slug:
        scores.append(fuzz.partial_ratio(question_slug, title_slug))
        scores.append(fuzz.token_set_ratio(question_slug, title_slug))
    if title:
        scores.append(fuzz.token_set_ratio(question_lower, title.lower()))

    return max(scores) if scores else 0

def _format_clarification(candidates):
    if not candidates:
        return "Mình chưa nhận ra phim bạn đang nói tới. Bạn mô tả thêm hoặc nêu rõ tên phim nhé."
    lines = ["Mình chưa chắc bạn đang nói tới phim nào. Bạn chọn giúp 1 phim nhé:"]
    for idx, movie in enumerate(candidates, 1):
        title = movie.get("title") or "Không rõ"
        year = movie.get("year")
        suffix = f" ({year})" if year else ""
        lines.append(f"{idx}. {title}{suffix}")
    return "\n".join(lines)

def _resolve_movie_from_question(user_question):
    movies = list(movies_col.find({}, {"slug": 1, "title": 1, "type": 1, "year": 1}))
    if not movies:
        return None, None

    question_slug = _slugify(user_question)
    question_lower = user_question.lower()
    matched = []

    for movie in movies:
        score = _fuzzy_score(question_slug, question_lower, movie)
        if score:
            matched.append((score, movie))

    if matched:
        matched.sort(key=lambda x: x[0], reverse=True)
        best_score, best_movie = matched[0]
        if best_score >= FUZZY_MATCH_THRESHOLD:
            close = [item for item in matched if best_score - item[0] <= FUZZY_AMBIGUOUS_DELTA]
            if len(close) > 1:
                return None, [item[1] for item in close[:3]]
            return best_movie, None

    movie_by_text = _find_movie_by_text(user_question)
    if movie_by_text:
        return movie_by_text, None

    if len(movies) == 1:
        return movies[0], None

    return None, None

def _tool_find_movie_by_name(query, top_k=3):
    movies = list(movies_col.find({}, {"_id": 1, "id": 1, "slug": 1, "title": 1, "type": 1, "year": 1}))
    if not movies:
        return {"matches": [], "note": "Không có phim trong DB."}

    question_slug = _slugify(query)
    question_lower = query.lower()
    scored = []
    for movie in movies:
        score = _fuzzy_score(question_slug, question_lower, movie)
        if score > 0:
            scored.append({
                **_movie_brief(movie, score=score),
            })

    scored.sort(key=lambda x: x.get("score", 0), reverse=True)
    return {"matches": scored[: max(1, int(top_k))]}

def _tool_search_movies_by_text(query, top_k=5):
    docs = list(movie_embeddings_col.find({}, {"movie_id": 1, "title": 1, "slug": 1, "vector_embedding": 1}))
    if not docs:
        return {"matches": [], "note": "Chưa có movie_embeddings. Hãy chạy sync_db.py."}

    query_vector = embedder.encode(query).reshape(1, -1)
    db_vectors = np.array([d["vector_embedding"] for d in docs])
    similarities = cosine_similarity(query_vector, db_vectors)[0]
    top_k = max(1, int(top_k))
    top_indices = similarities.argsort()[-top_k:][::-1]

    results = []
    movie_ids = [docs[idx]["movie_id"] for idx in top_indices]
    movie_map = {m["_id"]: m for m in movies_col.find({"_id": {"$in": movie_ids}}, {"_id": 1, "id": 1, "slug": 1, "title": 1, "year": 1, "type": 1, "synopsis": 1})}

    for idx in top_indices:
        doc = docs[idx]
        score = similarities[idx]
        movie = movie_map.get(doc["movie_id"])
        if not movie:
            continue
        item = _movie_brief(movie, score=score)
        item["synopsis"] = _truncate_text(movie.get("synopsis", ""), 240)
        results.append(item)

    return {"matches": results}

def _tool_search_movies_by_tags(tags, top_k=5, match_all=False):
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]
    tags = [t.strip() for t in (tags or []) if t and str(t).strip()]
    if not tags:
        return {"matches": [], "note": "Thiếu tags để tìm kiếm."}

    query = {"tags": {"$all": tags}} if match_all else {"tags": {"$in": tags}}
    cursor = movies_col.find(query, {"_id": 1, "id": 1, "slug": 1, "title": 1, "year": 1, "type": 1, "synopsis": 1}).limit(int(top_k) or 5)
    results = []
    for movie in cursor:
        item = _movie_brief(movie)
        item["synopsis"] = _truncate_text(movie.get("synopsis", ""), 240)
        results.append(item)
    return {"matches": results, "tags": tags, "match_all": bool(match_all)}

def _tool_get_movie_meta(movie_id=None, slug=None, movie_code=None):
    movie = _resolve_movie(movie_id=movie_id, slug=slug, movie_code=movie_code)
    if not movie:
        return {"movie": None, "note": "Không tìm thấy phim."}

    episodes = movie.get("episodes") or []
    return {
        "movie": {
            "id": movie.get("id"),
            "slug": movie.get("slug"),
            "title": movie.get("title"),
            "link": _movie_link(movie),
            "type": movie.get("type"),
            "synopsis": movie.get("synopsis"),
            "year": movie.get("year"),
            "duration": movie.get("duration"),
            "rating": movie.get("rating"),
            "tags": movie.get("tags", []),
            "cast": movie.get("cast", []),
            "director": movie.get("director"),
            "country": movie.get("country"),
            "seriesStatus": movie.get("seriesStatus"),
            "episodes_count": len(episodes) if movie.get("type") == "series" else 1,
        }
    }

def _tool_search_video_vectors(query, movie_id=None, slug=None, movie_code=None, episode=None, top_k=5):
    movie = _resolve_movie(movie_id=movie_id, slug=slug, movie_code=movie_code)
    if not movie:
        return {"matches": [], "note": "Không tìm thấy phim."}

    filter_query = {"movie_id": movie["_id"]}
    if episode is not None:
        try:
            filter_query["episode"] = int(episode)
        except (TypeError, ValueError):
            pass

    cursor = vectors_col.find(filter_query, {"vector_embedding": 1, "content": 1, "start": 1, "episode": 1})
    data_points = list(cursor)
    if not data_points:
        return {"matches": [], "note": "Chưa có dữ liệu video_vectors."}

    query_vector = embedder.encode(query).reshape(1, -1)
    db_vectors = np.array([d["vector_embedding"] for d in data_points])
    similarities = cosine_similarity(query_vector, db_vectors)[0]
    top_k = max(1, int(top_k))
    top_indices = similarities.argsort()[-top_k:][::-1]

    results = []
    for idx in top_indices:
        item = data_points[idx]
        results.append(
            {
                "start": item.get("start"),
                "episode": item.get("episode"),
                "content": _truncate_text(item.get("content", ""), 280),
                "score": float(similarities[idx]),
            }
        )

    return {
        "movie": _movie_brief(movie),
        "matches": results,
    }

def _tool_get_full_transcript(movie_id=None, slug=None, movie_code=None, episode=None, max_chars=12000):
    movie = _resolve_movie(movie_id=movie_id, slug=slug, movie_code=movie_code)
    if not movie:
        return {"content": "", "note": "Không tìm thấy phim."}

    ep = None
    if episode is not None:
        try:
            ep = int(episode)
        except (TypeError, ValueError):
            ep = None

    transcript = get_full_transcript(movie["_id"], ep)
    truncated = False
    if max_chars is not None:
        try:
            max_chars = int(max_chars)
        except (TypeError, ValueError):
            max_chars = 12000
        if max_chars > 0 and len(transcript) > max_chars:
            transcript = transcript[: max_chars - 3] + "..."
            truncated = True

    return {
        "movie": _movie_brief(movie),
        "episode": ep,
        "content": transcript,
        "truncated": truncated,
    }

TOOL_REGISTRY = {
    "find_movie_by_name": _tool_find_movie_by_name,
    "search_movies_by_text": _tool_search_movies_by_text,
    "search_movies_by_tags": _tool_search_movies_by_tags,
    "get_movie_meta": _tool_get_movie_meta,
    "search_video_vectors": _tool_search_video_vectors,
    "get_full_transcript": _tool_get_full_transcript,
}

TOOL_GUIDE = """
1) find_movie_by_name: tìm phim theo tên/slug (chịu lỗi gõ).
   Args: { query, top_k? }
2) search_movies_by_text: tìm phim theo mô tả tự nhiên.
   Args: { query, top_k? }
3) search_movies_by_tags: tìm phim theo thể loại/tags.
   Args: { tags, top_k?, match_all? }
4) get_movie_meta: lấy thông tin tổng quan phim.
   Args: { movie_id?, slug?, movie_code? }
5) search_video_vectors: tìm đoạn liên quan trong video (có thể chỉ định tập).
   Args: { query, movie_id?, slug?, movie_code?, episode?, top_k? }
6) get_full_transcript: lấy toàn bộ transcript của 1 tập.
   Args: { movie_id?, slug?, movie_code?, episode?, max_chars? }

Gợi ý:
- Nếu user muốn tóm tắt tập, hãy xác định đúng phim/tập trước (find_movie_by_name hoặc search_movies_by_text),
  sau đó gọi get_full_transcript với episode, rồi mới trả lời.
""".strip()

def get_latest_episode(movie_id):
    doc = vectors_col.find_one(
        {"movie_id": movie_id},
        {"episode": 1},
        sort=[("episode", -1)],
    )
    return doc.get("episode") if doc else None



# --- HÀM MỚI: LẤY TOÀN BỘ NỘI DUNG TẬP PHIM ---
def get_full_transcript(movie_id, episode=None):
    """
    Lấy toàn bộ text của 1 tập phim, sắp xếp theo thời gian
    """
    query = {"movie_id": movie_id}
    if episode:
        query["episode"] = episode
    
    # Lấy hết, sort theo thời gian (start tăng dần)
    # Chỉ lấy field 'content' cho nhẹ
    cursor = vectors_col.find(query, {"content": 1, "start": 1}).sort("start", 1)
    
    full_text = ""
    for doc in cursor:
        # Ghép lại: [10s] Nội dung... \n
        full_text += f"- [{doc['start']}s]: {doc['content']}\n"
        
    return full_text

def _split_text_chunks(text, max_chars=4800, max_chunks=6):
    if not text:
        return []
    lines = [line for line in text.splitlines() if line.strip()]
    chunks = []
    current = []
    size = 0
    for line in lines:
        extra = len(line) + 1
        if size + extra > max_chars and current:
            chunks.append("\n".join(current))
            current = [line]
            size = extra
        else:
            current.append(line)
            size += extra
    if current:
        chunks.append("\n".join(current))
    if max_chunks and len(chunks) > max_chunks:
        head = chunks[: max_chunks - 1]
        tail = chunks[-1]
        chunks = head + [tail]
    return chunks

def _summarize_transcript_chunks(transcript, title, episode):
    chunks = _split_text_chunks(transcript)
    if not chunks:
        return ""
    summaries = []
    total = len(chunks)
    for idx, chunk in enumerate(chunks, 1):
        prompt = f"""
Bạn là trợ lý phim. Hãy tóm tắt ngắn gọn nội dung đoạn {idx}/{total} của tập {episode} phim "{title}" (2-3 câu),
nêu diễn biến chính theo thứ tự, không bịa.

Nội dung:
{chunk}
""".strip()
        summary = (_try_generate_text(prompt, "summary_chunk") or "").strip()
        if summary:
            summaries.append(summary)
    if not summaries:
        return ""
    if len(summaries) == 1:
        return summaries[0]
    merged = "\n".join(f"- {item}" for item in summaries)
    final_prompt = f"""
Dựa trên các tóm tắt từng đoạn của tập {episode} phim "{title}" dưới đây, hãy viết tóm tắt 6-8 câu,
mạch lạc, theo thứ tự thời gian, không bịa.

Tóm tắt từng đoạn:
{merged}
""".strip()
    final = (_try_generate_text(final_prompt, "summary_merge") or "").strip()
    return final if final else "\n".join(summaries)

def _format_tool_history(tool_history, max_chars=12000):
    if not tool_history:
        return "[]"
    payload = json.dumps(tool_history, ensure_ascii=False)
    return _truncate_text(payload, max_chars=max_chars)

def _tool_signature(action, args):
    try:
        payload = json.dumps(args or {}, ensure_ascii=False, sort_keys=True)
    except TypeError:
        payload = str(args)
    return f"{action}:{payload}"

def _build_agent_prompt(user_question, tool_history, current_slug=None, current_episode=None, detected_episode=None, session_context=None):
    tool_names = ", ".join(sorted(TOOL_REGISTRY.keys()))
    context_lines = []
    if current_slug:
        context_lines.append(f"- current_slug: {current_slug}")
    if current_episode is not None:
        context_lines.append(f"- current_episode: {current_episode}")
    if detected_episode is not None:
        context_lines.append(f"- detected_episode: {detected_episode}")
    context_text = "\n".join(context_lines) if context_lines else "- none"

    history_text = _format_tool_history(tool_history)
    session_text = session_context or "Không có"
    return f"""
Bạn là bộ điều phối cho chatbot phim. Hãy chọn tool phù hợp hoặc trả lời trực tiếp.
Luật:
- Chỉ trả JSON thuần (không markdown, không code block).
- action phải là một trong: {tool_names} hoặc "final".
- Khi gọi tool, luôn kèm args.
- Không bịa dữ liệu; chỉ dùng dữ liệu tool trả về.
- Nếu chưa đủ thông tin, hỏi lại người dùng trong "final".
- Nếu câu hỏi là tóm tắt tập, ưu tiên: xác định đúng phim/tập -> get_full_transcript -> final.

Tool list:
{TOOL_GUIDE}

Ngữ cảnh:
{context_text}

Lịch sử tool:
{history_text}

Bối cảnh phiên:
{session_text}

Câu hỏi user: "{user_question}"
""".strip()

def _build_final_prompt(user_question, tool_history, session_context=None):
    history_text = _format_tool_history(tool_history)
    session_text = session_context or "Không có"
    return f"""
Bạn là trợ lý phim. Dựa trên dữ liệu tool dưới đây để trả lời người dùng bằng tiếng Việt, rõ ràng, thân thiện.
Trả lời khoảng 4-6 câu. Nếu là gợi ý phim, hãy đưa 3-5 phim và mỗi phim 1-2 câu mô tả.
Nếu không đủ dữ liệu, hãy hỏi lại ngắn gọn để lấy thêm thông tin.
Khi nhắc tới phim cụ thể, hãy kèm link dạng Markdown: [Tên phim](/movie/{{id}}).

Tool data:
{history_text}

Bối cảnh phiên:
{session_text}

Câu hỏi user: "{user_question}"
""".strip()

def _ask_chatbot_agent(user_question, current_slug=None, current_episode=None, session_id=None):
    global LAST_CLARIFICATION, LAST_USER_QUESTION
    tool_history = []
    detected_episode = _detect_episode(user_question)
    session_id = _normalize_session_id(session_id)
    session_context = _get_session_context(session_id)

    max_steps = TOOL_MAX_STEPS
    if LLM_PROVIDER == "llama_cpp":
        max_steps = min(max_steps, 3)
    for _ in range(max_steps):
        prompt = _build_agent_prompt(
            user_question,
            tool_history,
            current_slug=current_slug,
            current_episode=current_episode,
            detected_episode=detected_episode,
            session_context=session_context,
        )
        response_text = _try_generate_text(prompt, "planner") or ""

        plan = _safe_json_load(response_text or "")
        if not plan:
            if tool_history:
                print("[TOOL] stop planning: invalid plan, keep current tool history")
                break
            fallback_args = {"query": user_question, "top_k": 5}
            print(f"[TOOL] search_movies_by_text args={fallback_args} (fallback_invalid_plan)")
            fallback_result = _tool_search_movies_by_text(**fallback_args)
            tool_history.append({
                "action": "search_movies_by_text",
                "args": fallback_args,
                "result": fallback_result,
                "note": "fallback_from_invalid_plan",
            })
            break

        action = (plan.get("action") or "").strip()
        if action == "final":
            answer = (plan.get("answer") or "").strip()
            if answer:
                _update_session_memory(session_id, user_question, answer)
            return answer if answer else None

        tool = TOOL_REGISTRY.get(action)
        if not tool:
            fallback_args = {"query": user_question, "top_k": 5}
            print(f"[TOOL] search_movies_by_text args={fallback_args} (fallback_unknown_tool:{action})")
            fallback_result = _tool_search_movies_by_text(**fallback_args)
            tool_history.append({
                "action": "search_movies_by_text",
                "args": fallback_args,
                "result": fallback_result,
                "note": f"fallback_from_unknown_tool:{action}",
            })
            break

        args = plan.get("args") or {}
        if tool_history:
            last = tool_history[-1]
            if last.get("action") == action:
                last_sig = _tool_signature(last.get("action"), last.get("args"))
                next_sig = _tool_signature(action, args)
                if last_sig == next_sig:
                    print(f"[TOOL] stop repeated {action} args={args}")
                    break
        print(f"[TOOL] {action} args={args}")
        try:
            result = tool(**args)
        except TypeError:
            result = tool(**{})
        except Exception as exc:
            result = {"error": str(exc)}

        if action == "find_movie_by_name":
            matches = result.get("matches") if isinstance(result, dict) else None
            if matches and isinstance(matches, list):
                top = matches[0]
                best_score = float(top.get("score", 0) or 0)
                second_score = float(matches[1].get("score", 0) or 0) if len(matches) > 1 else 0
                if len(matches) > 1 and (
                    best_score < FUZZY_MATCH_THRESHOLD
                    or (best_score - second_score) <= FUZZY_AMBIGUOUS_DELTA
                ):
                    LAST_CLARIFICATION = matches[:3]
                    LAST_USER_QUESTION = user_question

        tool_history.append({"action": action, "args": args, "result": result})
        if action == "get_full_transcript":
            print("[TOOL] stop planning: got full transcript")
            break

    try:
        final_prompt = _build_final_prompt(user_question, tool_history, session_context=session_context)
        answer = (_try_generate_text(final_prompt, "final") or "").strip() or None
        if answer:
            _update_session_memory(session_id, user_question, answer)
        return answer
    except Exception as exc:
        print(f"⚠️ Lỗi gọi Gemini final: {exc}")
        return None

def _ask_chatbot_legacy(user_question, current_slug=None, current_episode=None, session_id=None):
    global LAST_CLARIFICATION, LAST_USER_QUESTION
    session_id = _normalize_session_id(session_id)
    movie_info = movies_col.find_one({"slug": current_slug}) if current_slug else None
    if not movie_info:
        movie_info, clarification = _resolve_movie_from_question(user_question)
        if clarification:
            LAST_CLARIFICATION = clarification
            LAST_USER_QUESTION = user_question
            return _format_clarification(clarification)
    if movie_info and ("synopsis" not in movie_info or "cast" not in movie_info):
        if movie_info.get("_id"):
            movie_info = movies_col.find_one({"_id": movie_info["_id"]})
        elif movie_info.get("slug"):
            movie_info = movies_col.find_one({"slug": movie_info["slug"]})

    if not movie_info:
        answer = "Mình chưa nhận ra phim bạn đang nói tới. Bạn mô tả thêm hoặc nêu rõ tên phim nhé."
        _update_session_memory(session_id, user_question, answer)
        return answer
    meta_title = movie_info.get('title', 'N/A')
    meta_cast = ", ".join(movie_info.get('cast', []))
    meta_director = movie_info.get('director', 'N/A')
    meta_synopsis = movie_info.get('synopsis', 'N/A')

    relevant_docs = search_knowledge_base(user_question, top_k=5, movie_id=movie_info['_id'])

    meta_info = f"""
    --- THÔNG TIN CHUNG VỀ PHIM ---
    - Tên phim: {meta_title}
    - Đạo diễn: {meta_director}
    - Diễn viên chính: {meta_cast}
    - Tóm tắt nội dung: {meta_synopsis}
    
    --- CÁC ĐOẠN CHI TIẾT TÌM THẤY TRONG VIDEO ---
    """

    is_summary_request = _decide_summary_mode(user_question)

    context_text = ""
    detected_episode = current_episode if current_episode is not None else _detect_episode(user_question)

    if is_summary_request:
        print("🚀 Phát hiện yêu cầu TÓM TẮT -> Đang tải toàn bộ kịch bản...")
        if detected_episode is None:
            if movie_info.get("type") == "series":
                detected_episode = get_latest_episode(movie_info["_id"])
            else:
                detected_episode = 1
        ep_to_summary = detected_episode if detected_episode else 1
        full_transcript = get_full_transcript(movie_info['_id'], ep_to_summary)
        
        if not full_transcript:
            answer = "Chưa có dữ liệu chi tiết cho tập này để tóm tắt."
            _update_session_memory(session_id, user_question, answer)
            return answer
            
        context_text = f"""
        Dưới đây là TOÀN BỘ nội dung chi tiết của Tập {ep_to_summary}:
        ---------------------
        {full_transcript}
        ---------------------
        """
        
        if LLM_PROVIDER == "llama_cpp":
            summary = _summarize_transcript_chunks(full_transcript, meta_title, ep_to_summary)
            if summary:
                _update_session_memory(session_id, user_question, summary)
                return summary
        system_instruction = "Bạn hãy đọc toàn bộ kịch bản trên và viết một đoạn tóm tắt nội dung đầy đủ, hấp dẫn, nêu bật các diễn biến chính (khoảng 6-8 câu)."

    else:
        print("🔎 Câu hỏi chi tiết -> Dùng Vector Search (Top 5)...")
        relevant_docs = search_knowledge_base(user_question, top_k=5, movie_id=movie_info['_id'])
        
        context_text = "Thông tin tìm được:\n"
        for doc in relevant_docs:
            context_text += f"- [{doc['start']}s]: {doc['content']}\n"
            
        system_instruction = "Trả lời câu hỏi dựa trên các đoạn thông tin rời rạc trên (khoảng 3-5 câu). Nếu không có thông tin thì nói không biết."

    prompt = f"""
    {meta_info}
    
    {context_text}
    
    YÊU CẦU: {system_instruction}
    CÂU HỎI USER: "{user_question}"
    """

    answer = _try_generate_text(prompt, "legacy")
    if answer:
        _update_session_memory(session_id, user_question, answer)
        return answer
    fallback = "Hệ thống đang bận. Bạn thử lại sau vài giây nhé."
    _update_session_memory(session_id, user_question, fallback)
    return fallback

# --- HÀM HỎI CHATBOT (LOGIC THÔNG MINH HƠN) ---
def ask_chatbot(user_question, current_slug=None, current_episode=None, session_id=None):
    print(f"\n❓ User: {user_question}")
    global LAST_CLARIFICATION, LAST_USER_QUESTION

    stripped = user_question.strip()
    if LAST_CLARIFICATION and stripped in {"1", "2", "3"}:
        idx = int(stripped) - 1
        if 0 <= idx < len(LAST_CLARIFICATION):
            picked = LAST_CLARIFICATION[idx]
            base_question = LAST_USER_QUESTION or "Bạn muốn biết gì về phim này?"
            LAST_CLARIFICATION = None
            LAST_USER_QUESTION = None
            picked_slug = picked.get("slug")
            answer = _ask_chatbot_agent(
                base_question,
                current_slug=picked_slug or current_slug,
                current_episode=current_episode,
                session_id=session_id,
            )
            if answer:
                return answer
            return _ask_chatbot_legacy(
                base_question,
                current_slug=picked_slug or current_slug,
                current_episode=current_episode,
                session_id=session_id,
            )
        LAST_CLARIFICATION = None
        LAST_USER_QUESTION = None

    if stripped and stripped not in {"1", "2", "3"}:
        LAST_USER_QUESTION = user_question

    answer = _ask_chatbot_agent(
        user_question,
        current_slug=current_slug,
        current_episode=current_episode,
        session_id=session_id,
    )
    if answer:
        return answer

    return _ask_chatbot_legacy(
        user_question,
        current_slug=current_slug,
        current_episode=current_episode,
        session_id=session_id,
    )

# --- TEST ---
if __name__ == "__main__":
    while True:
        user_input = input("\nNhập câu hỏi (hoặc 'exit' để thoát): ").strip()
        if not user_input or user_input.lower() in {"exit", "quit"}:
            break
        print(ask_chatbot(user_input))
