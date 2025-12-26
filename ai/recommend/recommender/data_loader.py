import pandas as pd


def load_movies(path: str) -> pd.DataFrame:
    """
    Đọc file lumi_ai.movies.csv.

    Các cột chính :
    - _id
    - movie_id
    - slug
    - title
    - synopsis
    - year
    - duration
    - rating
    - poster_url
    - genres
    - moods
    - countries
    - actors
    - directors
    - trending
    - createdAt
    - updatedAt
    - __v
    """
    movies = pd.read_csv(path)

    # Đổi id -> movie_id để dùng nhất quán trong model
    if "id" in movies.columns:
        movies = movies.rename(columns={"id": "movie_id"})

    return movies


def build_interactions(fav_path: str, hist_path: str) -> pd.DataFrame:
    """
    Gộp favorites + watchhistories thành bảng (user_id, movie_id, weight).

    File favorites:
    - user_id
    - movie_id
    - slug
    - createdAt
    - updatedAt
    - __v

    File watchhistories:
    - user_id
    - movie_id
    - slug
    - last_watched_at
    - createdAt
    - updatedAt
    - __v
    """
    favorites = pd.read_csv(fav_path)
    watch = pd.read_csv(hist_path)

    # Gán trọng số: favorite (thích) cao hơn lịch sử xem
    favorites["weight"] = 2.0
    watch["weight"] = 1.0

    # Chỉ giữ các cột cần thiết
    inter = pd.concat(
        [
            favorites[["user_id", "movie_id", "weight"]],
            watch[["user_id", "movie_id", "weight"]],
        ],
        ignore_index=True,
    )

    # Nếu cùng user_id + movie_id xuất hiện nhiều lần => cộng weight
    inter = (
        inter.groupby(["user_id", "movie_id"])["weight"]
        .sum()
        .reset_index()
    )

    return inter
