import os
import json
import pymongo
from datetime import datetime
from sentence_transformers import SentenceTransformer

# 1. Cấu hình
MONGO_URI = "mongodb://localhost:27017/"
client = pymongo.MongoClient(MONGO_URI)
db = client["lumi_ai"]
movies_col = db["movies"]
vectors_col = db["video_vectors"]
movie_embeddings_col = db["movie_embeddings"]

# Lưu ý: Dùng đường dẫn tuyệt đối (Absolute Path) để tránh lỗi không tìm thấy file
# Ví dụ: r"D:\Code\ProjectWeb\ai\chatbot\data"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DRIVE_PATH = os.path.join(BASE_DIR, "data")
VECTOR_FILE_SUFFIXES = ("_vector_data.json", "_vector_final.json")
MOVIE_EMBEDDING_FLAG = "embedding_synced"
MOVIE_EMBEDDING_MODEL = "paraphrase-multilingual-mpnet-base-v2"
EMBED_BATCH_SIZE = 32

def sync_to_local_db():
    print(f"📂 Đang quét thư mục: {os.path.abspath(LOCAL_DRIVE_PATH)}")
    
    if not os.path.exists(LOCAL_DRIVE_PATH):
        print("❌ Lỗi: Không tìm thấy thư mục data. Kiểm tra lại đường dẫn!")
        return

    for slug_folder in os.listdir(LOCAL_DRIVE_PATH):
        folder_full_path = os.path.join(LOCAL_DRIVE_PATH, slug_folder)
        if not os.path.isdir(folder_full_path): continue
        
        # --- A. LẤY INFO PHIM ---
        movie_info = movies_col.find_one({"slug": slug_folder})
        
        if not movie_info:
            print(f"⚠️ Bỏ qua folder '{slug_folder}': Không khớp slug nào trong DB.")
            continue
            
        print(f"🎬 Đang đồng bộ: {movie_info['title']} ({movie_info['type']})")
        
        # --- B. QUÉT FILE JSON ---
        for file_name in os.listdir(folder_full_path):
            if file_name.endswith(VECTOR_FILE_SUFFIXES):
                json_path = os.path.join(folder_full_path, file_name)
                print(f"   -> Đọc file: {file_name}")
                
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        data_vectors = json.load(f)
                except Exception as e:
                    print(f"      ❌ Lỗi đọc file JSON: {e}")
                    continue
                
                if not data_vectors: continue

                # --- C. CHUẨN BỊ INSERT ---
                records_to_insert = []
                for item in data_vectors:
                    
                    # XỬ LÝ KHÁC BIỆT GIỮA MOVIE VÀ SERIES TẠI ĐÂY
                    # Nếu là phim lẻ (single) mà trong JSON không có field 'episode'
                    # thì ta mặc định gán nó là 1 (hoặc 0) để dễ quản lý.
                    current_episode = item.get('episode')
                    if current_episode is None:
                         # Nếu phim lẻ, gán default = 1. Nếu series, bắt buộc phải có trong JSON
                        current_episode = 1 if movie_info['type'] == 'single' else None

                    if current_episode is None:
                        print("      ⚠️ Dữ liệu thiếu field 'episode', bỏ qua dòng này.")
                        continue

                    # Check trùng lặp
                    exists = vectors_col.find_one({
                        "movie_id": movie_info['_id'],
                        "episode": current_episode,
                        "start": item['start']
                    })
                    
                    if exists: continue 
                    
                    # Chuẩn hóa record trước khi lưu
                    item['movie_id'] = movie_info['_id'] 
                    item['episode'] = current_episode # Gán lại giá trị đã chuẩn hóa
                    item['created_at'] = datetime.now()
                    
                    # Xóa field thừa
                    if 'slug' in item: del item['slug']
                    if '_id' in item: del item['_id'] # Xóa id cũ nếu có
                    
                    records_to_insert.append(item)
                
                # --- D. INSERT ---
                if records_to_insert:
                    vectors_col.insert_many(records_to_insert)
                    print(f"      ✅ Đã thêm {len(records_to_insert)} records.")
                else:
                    print("      💤 Dữ liệu đã tồn tại, không thêm mới.")

def _build_movie_embedding_text(movie):
    parts = []

    def add(label, value):
        if value is None or value == "" or value == []:
            return
        if isinstance(value, list):
            cleaned = [str(v).strip() for v in value if str(v).strip()]
            if not cleaned:
                return
            parts.append(f"{label}: {', '.join(cleaned)}")
            return
        parts.append(f"{label}: {value}")

    add("Tên phim", movie.get("title"))
    add("Tóm tắt", movie.get("synopsis"))
    add("Đạo diễn", movie.get("director"))
    add("Diễn viên", movie.get("cast"))
    add("Thể loại", movie.get("tags"))
    add("Năm phát hành", movie.get("year"))
    add("Thời lượng", movie.get("duration"))
    add("Điểm đánh giá", movie.get("rating"))
    add("Quốc gia", movie.get("country"))
    add("Trạng thái series", movie.get("seriesStatus"))
    add("Loại phim", "phim bộ" if movie.get("type") == "series" else "phim lẻ")
    episodes = movie.get("episodes") or []
    if movie.get("type") == "series":
        add("Số tập", len(episodes))
        if episodes:
            ep_parts = []
            for ep in episodes:
                if not ep:
                    continue
                number = ep.get("number")
                title = ep.get("title")
                duration = ep.get("duration")
                label = f"Tập {number}" if number is not None else "Tập"
                details = [d for d in [title, duration] if d]
                if details:
                    label = f"{label} ({' - '.join(details)})"
                ep_parts.append(label)
            if ep_parts:
                parts.append("Danh sách tập: " + "; ".join(ep_parts))
    else:
        add("Số tập", 1)

    return "\n".join(parts).strip()

def sync_movie_embeddings():
    movies = list(
        movies_col.find(
            {},
            {
                "_id": 1,
                "id": 1,
                "slug": 1,
                "title": 1,
                "type": 1,
                "synopsis": 1,
                "year": 1,
                "duration": 1,
                "rating": 1,
                "trailerUrl": 1,
                "videoUrl": 1,
                "videoType": 1,
                "tags": 1,
                "cast": 1,
                "director": 1,
                "episodes": 1,
                "country": 1,
                "seriesStatus": 1,
                MOVIE_EMBEDDING_FLAG: 1,
            },
        )
    )

    if not movies:
        print("⚠️ Không có phim trong DB để embed.")
        return

    embedded_ids = {
        doc["movie_id"]
        for doc in movie_embeddings_col.find({}, {"movie_id": 1})
        if doc.get("movie_id") is not None
    }

    to_embed = []
    for movie in movies:
        has_flag = movie.get(MOVIE_EMBEDDING_FLAG) is True
        has_embedding = movie.get("_id") in embedded_ids
        if has_flag and has_embedding:
            continue

        text = _build_movie_embedding_text(movie)
        if not text:
            continue
        to_embed.append((movie, text))

    if not to_embed:
        print("💤 Không có phim nào cần embed.")
        return

    print(f"🧠 Đang embed {len(to_embed)} phim...")
    embedder = SentenceTransformer(MOVIE_EMBEDDING_MODEL)

    for i in range(0, len(to_embed), EMBED_BATCH_SIZE):
        batch = to_embed[i : i + EMBED_BATCH_SIZE]
        texts = [item[1] for item in batch]
        vectors = embedder.encode(texts)

        for (movie, text), vector in zip(batch, vectors):
            movie_embeddings_col.update_one(
                {"movie_id": movie["_id"]},
                {
                    "$set": {
                        "movie_id": movie["_id"],
                        "slug": movie.get("slug"),
                        "title": movie.get("title"),
                        "vector_embedding": vector.tolist(),
                        "updated_at": datetime.now(),
                    }
                },
                upsert=True,
            )

            movies_col.update_one(
                {"_id": movie["_id"]},
                {"$set": {MOVIE_EMBEDDING_FLAG: True}},
            )

    print(f"✅ Đã embed xong {len(to_embed)} phim.")

if __name__ == "__main__":
    sync_to_local_db()
    sync_movie_embeddings()
    print("\n🎉 Hoàn tất!")
