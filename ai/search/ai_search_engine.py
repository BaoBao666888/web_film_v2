from sentence_transformers import SentenceTransformer
import numpy as np
import pickle
from rapidfuzz import fuzz
import os
import re
from underthesea import pos_tag


def clean_text(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"https?://\S+|www\.\S+", " ", s)
    s = re.sub(r"[^\w\sÀ-ỹ]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def auto_query(raw: str) -> str:
    """
    Tự động rút keyword từ câu tự nhiên tiếng Việt, nhưng KHÔNG làm mất keyword quan trọng.
    - POS tag để lấy danh từ/danh từ riêng/tính từ.
    - Nếu kết quả lọc quá ngắn hoặc rỗng -> fallback dùng câu đã clean.
    """
    q = clean_text(raw)
    if not q:
        return ""

    tagged = pos_tag(q)  # [(word, tag), ...]
    keep_tags = {"N", "Np", "A"}  # danh từ, danh từ riêng, tính từ

    keywords = [w for (w, t) in tagged if t in keep_tags and len(w) > 1]
    kw = " ".join(keywords).strip()

    # Fallback thông minh: tránh mất tên riêng (vd: doraemon)
    if (not kw) or (len(kw.split()) <= 1 and len(q.split()) >= 3):
        return q

    return kw


class MovieSearchEngine:
    def __init__(self, model_path=None, index_path=None):
        base_dir = os.path.dirname(os.path.abspath(__file__))

        if model_path is None:
            model_path = os.path.join(base_dir, "models", "movie_semantic_vi")
        if index_path is None:
            index_path = os.path.join(base_dir, "data", "movie_index.pkl")

        print(f"📁 Model path: {model_path}")
        print(f"📁 Index path: {index_path}")

        # === Load model ===
        try:
            if os.path.isdir(model_path) and os.path.isfile(os.path.join(model_path, "config.json")):
                print(f"✅ Load model fine-tune: {model_path}")
                self.model = SentenceTransformer(model_path)
            else:
                print("⚠️ Không thấy fine-tune, dùng model gốc.")
                self.model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        except Exception as e:
            print("⚠️ Lỗi load model, fallback base.")
            print(e)
            self.model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

        # === Load index ===
        if not os.path.isfile(index_path):
            raise FileNotFoundError(f"❌ Không tìm thấy index: {index_path} (hãy chạy ai_build_index.py)")

        print(f"🔹 Load index phim từ: {index_path}")
        with open(index_path, "rb") as f:
            data = pickle.load(f)

        self.embeddings = np.asarray(data["embeddings"], dtype="float32")
        self.ids = data["ids"]
        self.titles = data["titles"]
        self.texts = data["texts"]
        self.thumbnails = data.get("thumbnails", ["" for _ in range(len(self.ids))])
        self.posters = data.get("posters", ["" for _ in range(len(self.ids))])

        # precompute norms để cosine nhanh và ổn định
        self.emb_norms = np.linalg.norm(self.embeddings, axis=1) + 1e-12

    def _semantic_scores(self, query: str):
        q_vec = self.model.encode(query)
        q_norm = np.linalg.norm(q_vec) + 1e-12
        sims = (self.embeddings @ q_vec) / (self.emb_norms * q_norm)  # [-1..1]
        return sims

    def _fuzzy_scores(self, query: str):
        # fuzzy match trên title + full text để chịu query tự nhiên
        scores = np.zeros(len(self.titles), dtype="float32")
        q = (query or "").lower().strip()

        for i in range(len(self.titles)):
            title = (self.titles[i] or "").lower()
            full = (self.texts[i] or "").lower()

            s1 = fuzz.partial_ratio(q, title)
            s2 = fuzz.partial_ratio(q, full)
            scores[i] = max(s1, s2) / 100.0

        return scores  # [0..1]

    def _fuzzy_title_scores(self, query: str):
        # fuzzy riêng cho title để boost tên phim/franchise (vd: doraemon)
        q = (query or "").lower().strip()
        scores = np.zeros(len(self.titles), dtype="float32")
        for i, t in enumerate(self.titles):
            title = (t or "").lower()
            scores[i] = fuzz.partial_ratio(q, title) / 100.0
        return scores  # [0..1]

    def search(self, raw_query: str, top_k=10):
        raw = raw_query or ""
        q_auto = auto_query(raw)
        if not q_auto:
            return []

        q_low = q_auto.lower()
        q_tokens = q_low.split()

        # 1) semantic
        sem = self._semantic_scores(q_auto)
        sem01 = (sem + 1.0) / 2.0  # [0..1]

        # 2) fuzzy full (title + text)
        fz = self._fuzzy_scores(q_auto)  # [0..1]

        # 3) fuzzy title riêng
        fz_title = self._fuzzy_title_scores(q_auto)  # [0..1]

        # === Heuristic tự động: query giống "tên phim" hay "mô tả"? ===
        best_title = float(np.max(fz_title))
        is_title_like = (len(q_tokens) <= 3) or (best_title >= 0.85)

        # === title boost tự động (không keyword list) ===
        title_boost = np.zeros(len(self.titles), dtype="float32")
        for i, t in enumerate(self.titles):
            title = (t or "").lower()

            # query là substring title -> boost mạnh
            if q_low and q_low in title:
                title_boost[i] = 0.35

            # fuzzy title cực cao -> boost vừa
            if fz_title[i] >= 0.90:
                title_boost[i] = max(title_boost[i], 0.25)

        # === Hybrid score tự động ===
        if is_title_like:
            # Query giống tên phim -> ưu tiên fuzzy_title để kéo đúng title lên
            score = 0.25 * sem01 + 0.35 * fz + 0.40 * fz_title + title_boost
            thr = 0.30
        else:
            # Query giống mô tả -> semantic quan trọng hơn
            score = 0.65 * sem01 + 0.35 * fz + title_boost
            thr = 0.40

        # fallback: nếu semantic yếu, tăng fuzzy tự động
        if float(np.max(sem01)) < 0.55:
            score = 0.40 * sem01 + 0.40 * fz + 0.20 * fz_title + title_boost
            thr = min(thr, 0.35)

        # Lấy top candidates
        top_idx = np.argsort(-score)[: max(top_k, 20)]

        results = []
        for i in top_idx:
            s = float(score[i])
            if s < thr:
                continue

            results.append(
                {
                    "id": self.ids[i],
                    "title": self.titles[i],
                    "score": s,
                    "semantic": float(sem01[i]),
                    "fuzzy": float(fz[i]),
                    "fuzzy_title": float(fz_title[i]),
                    "processed_query": q_auto,
                    "text": self.texts[i],
                    "thumbnail": self.thumbnails[i],
                    "poster": self.posters[i],
                }
            )

            if len(results) >= top_k:
                break

        return results


if __name__ == "__main__":
    engine = MovieSearchEngine()
    while True:
        q = input("Nhập từ khóa tìm phim (q để thoát): ")
        if q.lower().strip() == "q":
            break

        res = engine.search(q, top_k=10)
        print("Kết quả:")
        for r in res[:10]:
            print(
                f"- [{r['id']}] {r['title']} "
                f"score={r['score']:.3f} sem={r['semantic']:.3f} "
                f"fz={r['fuzzy']:.3f} fz_title={r['fuzzy_title']:.3f} "
                f"| processed='{r['processed_query']}'"
            )
        print()
