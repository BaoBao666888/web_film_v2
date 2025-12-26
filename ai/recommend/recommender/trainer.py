from typing import Dict, Any
import numpy as np
import joblib
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

from .data_loader import load_movies, build_interactions


def train_recommender(
    movies_csv: str,
    favorites_csv: str,
    watch_csv: str,
    model_output: str,
) -> None:
    """
    Train mô hình gợi ý item-item:

    - Input: 3 CSV (movies, favorites, watchhistories)
    - Output: 1 file model `recommender.joblib`
    """

    # 1. Load dữ liệu
    movies = load_movies(movies_csv)
    interactions = build_interactions(favorites_csv, watch_csv)

    # 2. Mapping user và movie sang index
    unique_users = interactions["user_id"].unique()
    unique_movies = interactions["movie_id"].unique()

    user2idx = {u: i for i, u in enumerate(unique_users)}
    movie2idx = {m: i for i, m in enumerate(unique_movies)}
    idx2movie = {i: m for m, i in movie2idx.items()}

    # 3. Tạo ma trận user-item dạng sparse
    rows = interactions["user_id"].map(user2idx).values
    cols = interactions["movie_id"].map(movie2idx).values
    data = interactions["weight"].values

    user_item_mat = csr_matrix(
        (data, (rows, cols)),
        shape=(len(unique_users), len(unique_movies)),
    )

    # 4. Item vectors = từng cột (movie) trong user_item_mat
    # Ma trận (n_items, n_users)
    item_matrix = user_item_mat.T

    # 5. Tính cosine similarity giữa các item
    similarity = cosine_similarity(item_matrix)  # shape: (n_items, n_items)

    # 6. Chuẩn bị dict: user_id -> list index phim đã xem
    user_items: Dict[str, Any] = {}
    for uid, group in interactions.groupby("user_id"):
        item_indices = group["movie_id"].map(movie2idx).tolist()
        user_items[uid] = item_indices

    # 7. Chuẩn bị metadata phim (key = movie_id)
    movies_meta = movies.set_index("movie_id").to_dict(orient="index")

    # 8. Đóng gói tất cả vào artifact
    artifact: Dict[str, Any] = {
        "user2idx": user2idx,
        "movie2idx": movie2idx,
        "idx2movie": idx2movie,
        "user_items": user_items,
        "similarity": similarity,
        "movies_meta": movies_meta,
    }

    joblib.dump(artifact, model_output)
    print(f"✅ Đã lưu model vào: {model_output}")
