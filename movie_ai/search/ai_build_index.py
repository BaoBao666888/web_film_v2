from sentence_transformers import SentenceTransformer
import pandas as pd
import numpy as np
import pickle
import os

def main():
    # Thư mục hiện tại của file này: D:\TLCN\movie_ai\search
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Đường dẫn model & data tuyệt đối
    model_path = os.path.join(base_dir, "models", "movie_semantic_vi")
    movies_csv = os.path.join(base_dir, "data", "movies.csv")
    index_path = os.path.join(base_dir, "data", "movie_index.pkl")

    print(f"🔹 Load model từ: {model_path}")
    model = SentenceTransformer(model_path)

    print(f"🔹 Load danh sách phim từ: {movies_csv}")
    df = pd.read_csv(movies_csv)

    def build_movie_text(row):
        return f"{row['title']}. {row['genres']}. {row['description']}"

    movie_texts = [build_movie_text(row) for _, row in df.iterrows()]
    movie_ids = df["id"].tolist()
    movie_titles = df["title"].tolist()

    print("🔹 Đang encode phim thành vector...")
    embeddings = model.encode(movie_texts, convert_to_numpy=True, show_progress_bar=True)

    # Đảm bảo thư mục data tồn tại
    os.makedirs(os.path.dirname(index_path), exist_ok=True)

    with open(index_path, "wb") as f:
        pickle.dump(
            {
                "embeddings": embeddings,
                "ids": movie_ids,
                "titles": movie_titles,
                "texts": movie_texts,
            },
            f,
        )

    print(f"✅ Đã build xong index, lưu ở: {index_path}")

if __name__ == "__main__":
    main()
