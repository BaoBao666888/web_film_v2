from flask import Flask, request, jsonify
from flask_cors import CORS

# import engine từ file cùng thư mục
from comment_filter_engine import CommentFilterEngine

app = Flask(__name__)
CORS(app)  # Cho phép frontend / backend khác port gọi tới

# Khởi tạo engine (load model 1 lần)
engine = CommentFilterEngine()


@app.post("/api/moderate")
def moderate_comment():
    """
    API lọc bình luận.

    Body JSON có thể là:
    - {"text": "một câu bình luận"}        -> mode: single
    - {"texts": ["cmt 1", "cmt 2", ...]}   -> mode: batch
    """
    data = request.get_json(silent=True) or {}

    # Trường hợp nhiều câu: texts = [...]
    if "texts" in data:
        texts = data.get("texts", [])
        if not isinstance(texts, list) or not texts:
            return jsonify({"error": "Trường 'texts' phải là list và không được rỗng"}), 400

        results = engine.predict_batch(texts)
        return jsonify({
            "mode": "batch",
            "count": len(results),
            "results": results
        })

    # Trường hợp 1 câu: text = "..."
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Thiếu 'text' hoặc 'texts' trong body"}), 400

    result = engine.predict_one(text)
    return jsonify({
        "mode": "single",
        "result": result
    })


if __name__ == "__main__":
    print("🚀 Comment Filter API đang chạy tại http://127.0.0.1:5002/api/moderate")
    app.run(host="0.0.0.0", port=5002, debug=True)
