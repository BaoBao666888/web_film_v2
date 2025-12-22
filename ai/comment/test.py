import pandas as pd
import numpy as np

# ====== TỰ TẠO WRAPPER (KHÔNG SỬA COMMENT_FILTER_ENGINE GỐC) ======
from comment_filter_engine import CommentFilterEngine


class CommentPredictWrapper:
    """
    Wrapper thêm hàm predict() mà KHÔNG sửa file comment_filter_engine gốc.
    """
    def __init__(self, model_path):
        self.engine = CommentFilterEngine(model_path=model_path)

        # Lấy các thành phần từ engine gốc
        self.encoder = self.engine.encoder
        self.clf = self.engine.clf
        self.id2label = self.engine.id2label

    def predict(self, text: str):
        """
        Dự đoán nhãn: clean / toxic / spam
        """
        if not isinstance(text, str):
            text = "" if text is None else str(text)

        emb = self.encoder.encode([text])
        probs = self.clf.predict_proba(emb)[0]
        class_ids = self.clf.classes_

        prob_dict = {}
        for cid, p in zip(class_ids, probs):
            prob_dict[self.id2label[cid]] = float(p)

        best_idx = probs.argmax()
        best_class_id = class_ids[best_idx]
        best_label = self.id2label[best_class_id]

        return {
            "label": best_label,
            "is_toxic": best_label == "toxic",
            "probs": prob_dict,
            "text": text,
        }


# ====== CẤU HÌNH ĐƯỜNG DẪN ======
OUTPUT_COMMENT_PATH = r"D:\web_film_v2\ai\comment\output_comment.csv"
TRAIN_PATH         = r"D:\web_film_v2\ai\comment\data\comments_train.csv"
MODEL_PATH         = r"D:\web_film_v2\ai\comment\models\comment_filter.joblib"
OUT_MERGED_PATH    = r"D:\web_film_v2\ai\comment\comments_train_merged_v2.csv"


print("🔹 Load CommentPredictWrapper...")
engine = CommentPredictWrapper(model_path=MODEL_PATH)


# ====== LOAD DATA ======
print("🔹 Đọc file output_comment.csv...")
df_out = pd.read_csv(OUTPUT_COMMENT_PATH, sep=";", engine="python", on_bad_lines="skip")

if "Bình luận" not in df_out.columns:
    raise ValueError(f"Không tìm thấy cột 'Bình luận'. Cột hiện có: {df_out.columns}")


# ====== B1: GÁN NHÃN BẰNG AI ======
def ai_label(text):
    return engine.predict(text)["label"]


print("🔹 Đang gán nhãn bằng AI...")
df_out["ai_label"] = df_out["Bình luận"].apply(ai_label)


# ====== B2: REFINE BẰNG KEYWORD ======
toxic_keywords = [
    "ngu", "óc chó", "óc cho", "đần", "địt", "đéo", "deo", "cút",
    "cmm", "clm", "đm", "dm", "vcl", "cặc", "cac", "lồn", "lon",
    "đụ", "rác", "rác rưởi", "trash"
]

spam_keywords = [
    "zalo", "facebook.com", "fb.com", "http://", "https://",
    "theo dõi", "follow", "sub cho", "vào nhóm", "group",
    "kiếm tiền onl", "kiếm tiền online", "ib mình",
    "inbox", "like page", "đăng ký kênh", "link này"
]


def refine_label(text, base_label):
    t = str(text).lower()

    for kw in spam_keywords:
        if kw in t:
            return "spam"

    for kw in toxic_keywords:
        if kw in t:
            if base_label != "spam":
                return "toxic"
            else:
                return "spam"

    return base_label


print("🔹 Refine nhãn bằng keyword...")
df_out["label"] = df_out.apply(
    lambda row: refine_label(row["Bình luận"], row["ai_label"]),
    axis=1
)

df_new = pd.DataFrame()
df_new["text"] = df_out["Bình luận"].astype(str)
df_new["label"] = df_out["label"].astype(str)


print("📊 Thống kê nhãn mới:")
print(df_new["label"].value_counts())


# ====== B3: GỘP VỚI FILE TRAIN GỐC ======
print("🔹 Đọc comments_train.csv gốc...")
df_train = pd.read_csv(TRAIN_PATH, sep=";", engine="python")

print("🔹 Gộp dữ liệu...")
df_merged = pd.concat([df_train, df_new], ignore_index=True)

df_merged["text"] = df_merged["text"].astype(str).str.strip()
df_merged = df_merged[df_merged["text"] != ""]
df_merged = df_merged[df_merged["text"].str.len() >= 3]

df_merged.to_csv(OUT_MERGED_PATH, sep=";", index=False, encoding="utf-8-sig")

print("✅ DONE! File cuối cùng lưu tại:")
print(OUT_MERGED_PATH)

print("📊 Thống kê sau khi gộp:")
print(df_merged["label"].value_counts())
