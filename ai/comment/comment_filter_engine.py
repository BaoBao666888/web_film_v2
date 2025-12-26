from sentence_transformers import SentenceTransformer
import numpy as np
import joblib
import os

class CommentFilterEngine:
    def __init__(self, model_path="models/comment_filter.joblib"):
        # Xác định đường dẫn tuyệt đối tới file model
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_full_path = os.path.join(base_dir, model_path)

        print(f"🔹 Load comment filter model từ: {model_full_path}")

        if not os.path.isfile(model_full_path):
            raise FileNotFoundError(f"❌ Không tìm thấy model: {model_full_path}")

        # Load dữ liệu model
        data = joblib.load(model_full_path)

        self.clf = data["clf"]
        self.label2id = data["label2id"]
        self.id2label = data["id2label"]
        base_model_name = data["base_model_name"]

        # Load encoder
        print(f"🔹 Load sentence-transformer base model: {base_model_name}")
        self.encoder = SentenceTransformer(base_model_name)

        # ⚠️ Chỉ 3 nhãn model: toxic | clean | spam
        self.clean_labels = {"clean"}
        self.toxic_labels = {"toxic", "spam"}

    def _predict_proba(self, emb):
        return self.clf.predict_proba(emb)

    def predict_one(self, text: str):
        """
        Phân loại 1 bình luận và trả thêm is_toxic (kết hợp model + rule)
        """
        # 1. Encode và lấy xác suất
        emb = self.encoder.encode([text])
        probs = self._predict_proba(emb)[0]
        label_id = int(np.argmax(probs))
        label_name = self.id2label[label_id].lower()

        # 2. Đưa probs về dict cho dễ xài
        probs_dict = {self.id2label[i]: float(p) for i, p in enumerate(probs)}
        toxic_prob = probs_dict.get("toxic", 0.0)
        spam_prob = probs_dict.get("spam", 0.0)

        # 3. Luật từ khóa thủ công (cho mấy câu kiểu "phim rẻ tiền")
        text_lower = text.lower()
        manual_blacklist = [
            "rẻ tiền",
            "phim rác",
            "rác phẩm",
            "phim như c",
            "phim như cc",
            "như hạch",
            "như cứt",
        ]
        rule_hit = any(kw in text_lower for kw in manual_blacklist)

        # 4. Logic quyết định is_toxic
        #    - nếu label != clean  -> toxic
        #    - hoặc prob toxic >= 0.30
        #    - hoặc prob spam  >= 0.30
        #    - hoặc trúng từ khóa blacklist
        is_toxic = (
            label_name != "clean"
            or toxic_prob >= 0.8
            or spam_prob >= 0.40
            or rule_hit
        )

        return {
            "text": text,
            "label": label_name,           # clean / toxic / spam
            "confidence": float(probs[label_id]),
            "is_toxic": bool(is_toxic),    # ✅ cờ cuối cùng dùng cho frontend
            "probs": probs_dict,
        }


    def predict_batch(self, texts):
        """
        Phân loại list bình luận (ít dùng)
        """
        emb = self.encoder.encode(texts, show_progress_bar=False)
        probs_all = self._predict_proba(emb)

        results = []
        for text, probs in zip(texts, probs_all):
            label_id = int(np.argmax(probs))
            label_name = self.id2label[label_id].lower()
            is_toxic = label_name not in self.clean_labels

            results.append({
                "text": text,
                "label": label_name,
                "confidence": float(probs[label_id]),
                "is_toxic": is_toxic,
                "probs": {self.id2label[i]: float(p) for i, p in enumerate(probs)},
            })

        return results


if __name__ == "__main__":
    engine = CommentFilterEngine()
    tests = [
        "phim hay quá cảm ơn ad",
        "đm up cái gì vậy đồ ngu",
        "vào nhóm zalo này kiếm tiền nè",
        "phim rác vãi",
    ]
    for t in tests:
        print(engine.predict_one(t))
