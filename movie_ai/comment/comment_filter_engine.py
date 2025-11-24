from sentence_transformers import SentenceTransformer
import numpy as np
import joblib
import os

class CommentFilterEngine:
    def __init__(self, model_path="models/comment_filter.joblib"):
        # xác định đường dẫn tuyệt đối tới thư mục chứa file này
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_full_path = os.path.join(base_dir, model_path)

        print(f"🔹 Load comment filter model từ: {model_full_path}")

        if not os.path.isfile(model_full_path):
            raise FileNotFoundError(f"❌ Không tìm thấy model: {model_full_path}")

        data = joblib.load(model_full_path)

        self.clf = data["clf"]
        self.label2id = data["label2id"]
        self.id2label = data["id2label"]
        base_model_name = data["base_model_name"]

        print(f"🔹 Load sentence-transformer base model: {base_model_name}")
        self.encoder = SentenceTransformer(base_model_name)

    def _predict_proba(self, emb):
        return self.clf.predict_proba(emb)

    def predict_one(self, text: str):
        """
        Trả về kết quả phân loại 1 bình luận
        """
        emb = self.encoder.encode([text])
        probs = self._predict_proba(emb)[0]
        label_id = int(np.argmax(probs))
        label_name = self.id2label[label_id]

        return {
            "text": text,
            "label": label_name,
            "confidence": float(probs[label_id]),
            "probs": {self.id2label[i]: float(p) for i, p in enumerate(probs)}
        }

    def predict_batch(self, texts):
        """
        Phân loại list bình luận
        """
        emb = self.encoder.encode(texts, show_progress_bar=False)
        probs_all = self._predict_proba(emb)

        results = []
        for text, probs in zip(texts, probs_all):
            label_id = int(np.argmax(probs))
            results.append({
                "text": text,
                "label": self.id2label[label_id],
                "confidence": float(probs[label_id]),
                "probs": {self.id2label[i]: float(p) for i, p in enumerate(probs)}
            })

        return results


if __name__ == "__main__":
    engine = CommentFilterEngine()
    tests = [
        "phim hay quá cảm ơn ad",
        "đm up cái gì vậy đồ ngu",
        "vào nhóm zalo này kiếm tiền nè",
    ]
    for t in tests:
        print(engine.predict_one(t))
