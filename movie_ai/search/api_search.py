from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_search_engine import MovieSearchEngine

app = Flask(__name__)
CORS(app)  # Cho phép frontend gọi từ domain/port khác

# Khởi tạo engine (load model + index 1 lần)
engine = MovieSearchEngine()

@app.route("/api/search", methods=["GET"])
def search_movies():
    # Lấy query từ ?q=...
    q = request.args.get("q", "").strip()
    top_k = request.args.get("top_k", "10")

    try:
        top_k = int(top_k)
    except ValueError:
        top_k = 10

    if not q:
        return jsonify({"results": [], "message": "Thiếu tham số q"}), 400

    # Gọi AI search
    results = engine.search(q, top_k=top_k)

    # Format JSON trả về
    return jsonify({
        "query": q,
        "count": len(results),
        "results": [
            {
                "id": r["id"],
                "title": r["title"],
                "score": r["score"],
                "text": r["text"],
            }
            for r in results
        ]
    })

if __name__ == "__main__":
    # Run API tại http://127.0.0.1:5001
    app.run(host="0.0.0.0", port=5001, debug=True)
