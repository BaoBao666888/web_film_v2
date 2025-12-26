from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_search_engine import MovieSearchEngine

app = Flask(__name__)
CORS(app)

engine = MovieSearchEngine()


@app.route("/api/search", methods=["GET"])
def search_movies():
    q = request.args.get("q", "").strip()
    top_k = int(request.args.get("top_k", "10") or "10")

    if not q:
        return jsonify({"error": "Missing q"}), 400

    results = engine.search(q, top_k=top_k)

    return jsonify(
        {
            "query": q,
            "count": len(results),
            "results": [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "score": r["score"],
                    "text": r["text"],
                    "thumbnail": r.get("thumbnail", ""),
                    "poster": r.get("poster", ""),
                }
                for r in results
            ],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
