import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import importlib.metadata as _importlib_metadata
    if not hasattr(_importlib_metadata, "packages_distributions"):
        import importlib_metadata as _importlib_metadata_backport
        _importlib_metadata.packages_distributions = (
            _importlib_metadata_backport.packages_distributions
        )
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
PROJECT_ROOT = os.path.dirname(ROOT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai.chatbot.chatbot import ask_chatbot


app = Flask(__name__)
CORS(app)


@app.get("/api/chatbot/health")
def health_check():
    return jsonify({"status": "ok"})


@app.post("/api/chatbot")
def chatbot_reply():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"message": "Thieu message"}), 400

    slug = data.get("slug")
    episode = data.get("episode")
    session_id = data.get("session_id") or data.get("sessionId")
    try:
        episode = int(episode) if episode is not None else None
    except (TypeError, ValueError):
        episode = None

    try:
        reply = ask_chatbot(
            message,
            current_slug=slug,
            current_episode=episode,
            session_id=session_id,
        )
        return jsonify({"reply": reply})
    except Exception as exc:
        print(f"[chatbot] error: {exc}")
        return jsonify({"message": "Chatbot loi", "detail": str(exc)}), 500


if __name__ == "__main__":
    host = os.getenv("AI_HOST", "0.0.0.0")
    port = int(os.getenv("AI_CHATBOT_PORT", "5005"))
    debug = os.getenv("AI_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug, use_reloader=False)
