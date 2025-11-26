from pathlib import Path

from recommender.trainer import train_recommender


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent

    movies_csv = base_dir / "data" / "lumi_ai.movies.csv"
    favorites_csv = base_dir / "data" / "lumi_ai.favorites.csv"
    watch_csv = base_dir / "data" / "lumi_ai.watchhistories.csv"
    model_output = base_dir / "models" / "recommender.joblib"

    # Tạo thư mục models nếu chưa có
    model_output.parent.mkdir(parents=True, exist_ok=True)

    train_recommender(
        str(movies_csv),
        str(favorites_csv),
        str(watch_csv),
        str(model_output),
    )
