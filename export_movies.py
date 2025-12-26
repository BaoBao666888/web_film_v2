import os
import json
from datetime import datetime, date
from bson import ObjectId
import pymongo

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB", "lumi_ai")
COLLECTION_NAME = os.getenv("MONGO_COLLECTION", "movies")
OUTPUT_PATH = os.getenv(
    "OUTPUT_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "lumi_ai.movies.json"),
)


def _normalize_value(value):
    if isinstance(value, dict):
        return {k: _normalize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize_value(v) for v in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    return value


def export_movies():
    client = pymongo.MongoClient(MONGO_URI)
    collection = client[DB_NAME][COLLECTION_NAME]

    docs = list(collection.find({}))
    normalized = _normalize_value(docs)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã ghi {len(docs)} records vào {OUTPUT_PATH}")


if __name__ == "__main__":
    export_movies()
