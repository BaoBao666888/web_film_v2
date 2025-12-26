import os
import pandas as pd
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

def load_train_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "data", "train_pairs.csv")

    print(f"🔹 Đọc file train từ: {csv_path}")

    df = pd.read_csv(csv_path)
    examples = [
        InputExample(texts=[row["query"], row["movie_text"]], label=1.0)
        for _, row in df.iterrows()
    ]
    return examples

def main():
    print("🔹 Load base model paraphrase-multilingual-MiniLM-L12-v2 ...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    print("🔹 Load train data...")
    train_examples = load_train_data()

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=8)
    train_loss = losses.CosineSimilarityLoss(model)

    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "movie_semantic_vi")
    os.makedirs(output_dir, exist_ok=True)

    print("🔹 Bắt đầu train bằng phương pháp cũ (không dùng Trainer)...")

    # DÙNG TRAIN KIỂU CŨ - KHÔNG CẦN ACCELERATE
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=5,
        warmup_steps=10,
        output_path=output_dir,
        show_progress_bar=True
    )

    print(f"🎉 Đã lưu mô hình tại: {output_dir}")

if __name__ == "__main__":
    main()
