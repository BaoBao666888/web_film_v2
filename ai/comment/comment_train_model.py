from sentence_transformers import SentenceTransformer
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os
from collections import Counter

BASE_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

def load_data():
    # Dùng đường dẫn tuyệt đối tới thư mục comment/
    base_dir = os.path.dirname(os.path.abspath(__file__))
    #csv_path = os.path.join(base_dir, "data", "comments_train.csv")
    csv_path = os.path.join(base_dir, "data", "comments_train_merged_v2.csv")

    print(f"🔹 Load data bình luận từ {csv_path} ...")

    # sep=";" vì file dùng dấu ; để ngăn cột
    df = pd.read_csv(csv_path, sep=";")

    print("🔹 Các cột đọc được:", list(df.columns))

    # Bỏ các dòng thiếu text hoặc label (nếu có)
    before = len(df)
    df = df.dropna(subset=["text", "label"])
    after = len(df)
    if after < before:
        print(f"⚠️ Đã loại {before - after} dòng thiếu text/label.")

    labels_str = df["label"].astype(str).tolist()
    texts = df["text"].astype(str).tolist()

    counts = Counter(labels_str)
    print("🔹 Số mẫu theo nhãn:", dict(counts))

    unique_labels = sorted(set(labels_str))
    label2id = {lab: i for i, lab in enumerate(unique_labels)}
    id2label = {i: lab for lab, i in label2id.items()}

    y = [label2id[l] for l in labels_str]
    return texts, y, label2id, id2label

def main():
    texts, y, label2id, id2label = load_data()

    print(f"✅ Số mẫu: {len(texts)}, số nhãn: {len(label2id)} ({label2id})")

    print(f"🔹 Load base model: {BASE_MODEL_NAME}")
    model = SentenceTransformer(BASE_MODEL_NAME)

    print("🔹 Đang encode comment thành vector (embeddings)...")
    X = model.encode(texts, show_progress_bar=True)

    counts = Counter(y)
    min_count = min(counts.values())
    if min_count >= 2 and len(y) >= 5:
        stratify = y
        print("🔹 Dùng stratify=y khi chia train/test.")
    else:
        stratify = None
        print(f"⚠️ Không dùng stratify (min_count={min_count}).")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    print("🔹 Train LogisticRegression classifier...")
    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_train, y_train)

    print("🔹 Đánh giá sơ bộ trên tập test:")
    target_names = [id2label[i] for i in sorted(id2label.keys())]
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=target_names))

    # Lưu model + mapping
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    out_path = os.path.join(models_dir, "comment_filter.joblib")

    joblib.dump(
        {
            "clf": clf,
            "label2id": label2id,
            "id2label": id2label,
            "base_model_name": BASE_MODEL_NAME,
        },
        out_path,
    )
    print(f"🎉 Đã lưu model lọc bình luận tại: {out_path}")

if __name__ == "__main__":
    main()
