import os
import pickle
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

BASE_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def load_model(base_dir: str):
  """
  Ưu tiên load model fine-tune ở models/movie_semantic_vi,
  nếu không có thì dùng model gốc.
  """
  ft_dir = os.path.join(base_dir, "models", "movie_semantic_vi")
  if os.path.isdir(ft_dir) and os.path.isfile(os.path.join(ft_dir, "config.json")):
      print(f"🔹 Load model từ fine-tune: {ft_dir}")
      return SentenceTransformer(ft_dir)
  print(f"⚠️ Không tìm thấy model fine-tune, dùng model gốc: {BASE_MODEL_NAME}")
  return SentenceTransformer(BASE_MODEL_NAME)


def main():
  base_dir = os.path.dirname(os.path.abspath(__file__))

  # CSV phim
  movies_csv = os.path.join(base_dir, "data", "movies.csv")
  print(f"🔹 Load danh sách phim từ: {movies_csv}")
  df = pd.read_csv(movies_csv)

  # Bắt buộc có 4 cột id,title,genres,description
  for col in ["id", "title", "genres", "description"]:
      if col not in df.columns:
          raise ValueError(f"Thiếu cột '{col}' trong {movies_csv}")

  # Nếu chưa có cột thumbnail/poster, tự sinh path theo id
  has_thumb = "thumbnail" in df.columns
  has_poster = "poster" in df.columns

  ids = []
  titles = []
  texts = []
  thumbnails = []
  posters = []

  for _, row in df.iterrows():
      mid = str(row["id"])
      title = str(row["title"])
      genres = str(row["genres"])
      desc = str(row["description"])

      text = f"{title}. {genres}. {desc}"

      ids.append(mid)
      titles.append(title)
      texts.append(text)

      if has_thumb:
          thumb = str(row["thumbnail"]) if not pd.isna(row["thumbnail"]) else ""
      else:
          # TODO: chỉnh path này cho khớp với web của bạn
          thumb = f"/images/movies/{mid}.jpg"

      if has_poster:
          poster = str(row["poster"]) if not pd.isna(row["poster"]) else ""
      else:
          poster = f"/images/movies/{mid}.jpg"

      thumbnails.append(thumb)
      posters.append(poster)

  print(f"✅ Số phim: {len(ids)}")

  # Load model & encode
  model = load_model(base_dir)
  print("🔹 Đang encode embeddings...")
  embeddings = model.encode(texts, show_progress_bar=True)
  embeddings = np.asarray(embeddings, dtype="float32")

  out_path = os.path.join(base_dir, "data", "movie_index.pkl")
  data = {
      "embeddings": embeddings,
      "ids": ids,
      "titles": titles,
      "texts": texts,
      "thumbnails": thumbnails,
      "posters": posters,
  }

  with open(out_path, "wb") as f:
      pickle.dump(data, f)

  print(f"🎉 Đã lưu index tại: {out_path}")


if __name__ == "__main__":
  main()
