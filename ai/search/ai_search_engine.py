from sentence_transformers import SentenceTransformer
import numpy as np
import pickle
from rapidfuzz import fuzz
import os


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
            if os.path.isdir(model_path) and os.path.isfile(
                os.path.join(model_path, "config.json")
            ):
                print(f"✅ Đang load model fine-tune từ: {model_path}")
                self.model = SentenceTransformer(model_path)
            else:
                print(
                    "⚠️ Không tìm thấy model fine-tune, dùng model gốc paraphrase-multilingual-MiniLM-L12-v2."
                )
                self.model = SentenceTransformer(
                    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
                )
        except Exception as e:
            print("⚠️ Lỗi khi load model fine-tune, fallback về model gốc.")
            print(e)
            self.model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )

        # === Load index ===
        print(f"🔹 Load index phim từ: {index_path}")
        with open(index_path, "rb") as f:
            data = pickle.load(f)

        self.embeddings = data["embeddings"]
        self.ids = data["ids"]
        self.titles = data["titles"]
        self.texts = data["texts"]
        # mới thêm
        self.thumbnails = data.get(
            "thumbnails", ["" for _ in range(len(self.ids))]
        )
        self.posters = data.get("posters", ["" for _ in range(len(self.ids))])

    # ------------------------------------------
    # SEMANTIC SEARCH
    # ------------------------------------------
    def _semantic_search(self, query, top_k=5):
        q_vec = self.model.encode(query)
        sims = np.dot(self.embeddings, q_vec) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(q_vec)
        )
        top_idx = np.argsort(-sims)[:top_k]
        results = []
        for i in top_idx:
            results.append(
                {
                    "id": self.ids[i],
                    "title": self.titles[i],
                    "score": float(sims[i]),
                    "text": self.texts[i],
                    "thumbnail": self.thumbnails[i],
                    "poster": self.posters[i],
                }
            )
        return results

    # ------------------------------------------
    # FUZZY SEARCH
    # ------------------------------------------
    def _fuzzy_search(self, query, top_k=5):
        scores = []
        for i, title in enumerate(self.titles):
            score = fuzz.token_sort_ratio(query, title)
            scores.append((i, score))
        scores.sort(key=lambda x: x[1], reverse=True)

        results = []
        for i, s in scores[:top_k]:
            results.append(
                {
                    "id": self.ids[i],
                    "title": self.titles[i],
                    "score": float(s) / 100.0,
                    "text": self.texts[i],
                    "thumbnail": self.thumbnails[i],
                    "poster": self.posters[i],
                }
            )
        return results

    # ------------------------------------------
    # COMBINE
    # ------------------------------------------
    def search(self, query, top_k=5):
        sem = self._semantic_search(query, top_k=top_k)
        fz = self._fuzzy_search(query, top_k=top_k)

        combined = []
        seen_ids = set()

        for item in sem + fz:
            if item["id"] not in seen_ids:
                combined.append(item)
                seen_ids.add(item["id"])
            if len(combined) >= top_k:
                break

        return combined


if __name__ == "__main__":
    engine = MovieSearchEngine()
    while True:
        q = input("Nhập từ khóa tìm phim (q để thoát): ")
        if q.lower().strip() == "q":
            break
        res = engine.search(q, top_k=5)
        print("Kết quả:")
        for r in res:
            print(
                f"- [{r['id']}] {r['title']} (score={r['score']:.3f}) thumb={r['thumbnail']}"
            )
        print()
