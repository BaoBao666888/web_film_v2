from pathlib import Path
from typing import Optional
import os

import pandas as pd
from pymongo import MongoClient
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from recommender.trainer import train_recommender
from recommender.service import RecommendationService

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_PATH = BASE_DIR / "models" / "recommender.joblib"

# 🔧 cấu hình MongoDB: sửa cho đúng với project của bạn
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "lumi_ai")  # tên database Mongo

app = FastAPI(
    title="Movie Recommender API",
    description="API gợi ý phim dựa trên lịch sử xem + favorites",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # sau này có thể thu hẹp
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def export_csv_from_mongo() -> None:
    """
    Lấy dữ liệu mới nhất từ MongoDB và ghi ra 3 file CSV:
    - data/lumi_ai.movies.csv
    - data/lumi_ai.favorites.csv
    - data/lumi_ai.watchhistories.csv

    Giả định:
      - collection movies       -> db.movies
      - collection favorites    -> db.favorites
      - collection watchhistory -> db.watchhistories
    """
    print("📥 Đang lấy dữ liệu mới từ MongoDB...")

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Lấy movies
    movies_cur = db.movies.find({}, {"_id": 0})  # bỏ _id vì CSV cũ không dùng
    movies_df = pd.DataFrame(list(movies_cur))
    movies_path = DATA_DIR / "lumi_ai.movies.csv"
    movies_df.to_csv(movies_path, index=False)
    print(f"   ✅ Ghi {len(movies_df)} dòng vào {movies_path}")

    # Lấy favorites
    fav_cur = db.favorites.find({}, {"_id": 0})
    fav_df = pd.DataFrame(list(fav_cur))
    fav_path = DATA_DIR / "lumi_ai.favorites.csv"
    fav_df.to_csv(fav_path, index=False)
    print(f"   ✅ Ghi {len(fav_df)} dòng vào {fav_path}")

    # Lấy watchhistories
    hist_cur = db.watchhistories.find({}, {"_id": 0})
    hist_df = pd.DataFrame(list(hist_cur))
    hist_path = DATA_DIR / "lumi_ai.watchhistories.csv"
    hist_df.to_csv(hist_path, index=False)
    print(f"   ✅ Ghi {len(hist_df)} dòng vào {hist_path}")


# khởi tạo service bằng model hiện có (nếu có sẵn file joblib)
service = RecommendationService(str(MODEL_PATH))


def retrain_from_mongo() -> None:
    """
    1) Export data từ MongoDB -> 3 CSV
    2) Train lại model từ 3 CSV
    3) Reload RecommendationService với model mới
    """
    global service

    print("🔁 Retrain model từ MongoDB...")
    export_csv_from_mongo()

    movies_csv = DATA_DIR / "lumi_ai.movies.csv"
    favorites_csv = DATA_DIR / "lumi_ai.favorites.csv"
    watch_csv = DATA_DIR / "lumi_ai.watchhistories.csv"

    train_recommender(
        str(movies_csv),
        str(favorites_csv),
        str(watch_csv),
        str(MODEL_PATH),
    )

    service = RecommendationService(str(MODEL_PATH))
    print("✅ Retrain xong, đã load model mới")


@app.post("/ai/retrain")
def manual_retrain():
    """
    Endpoint phụ: nếu muốn test train thủ công.
    """
    retrain_from_mongo()
    return {"message": "retrained"}


@app.get("/ai/recommendations")
def get_recommendations(
    user_id: Optional[str] = Query("guest", description="ID user từ front-end"),
    limit: int = Query(10, ge=1, le=50),
):
    """
    MỖI LẦN GỌI:
      1) Lấy lại dữ liệu mới từ MongoDB (movies, favorites, watchhistories)
      2) Train lại model collaborative filtering
      3) Gợi ý phim cho user_id với model vừa train
    """

    # 1) Train lại model từ Mongo (dùng CSV trung gian)
    retrain_from_mongo()

    raw_user_id = user_id or "guest"
    model_user_id = raw_user_id  # nếu sau này cần map thì sửa chỗ này

    known = model_user_id in service.user_items

    print("📥 /ai/recommendations called")
    print(f"   raw_user_id   = {raw_user_id}")
    print(f"   model_user_id = {model_user_id}")
    print(f"   known_in_model? {known}")

    # 2) Gợi ý với model mới
    items = service.recommend_for_user(user_id=model_user_id, top_k=limit)

    return {
        "items": items,
        "playlists": [],
    }
