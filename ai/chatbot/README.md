# Chatbot phim (ai/chatbot)

Thư mục này chứa API chatbot phim và các script hỗ trợ.

## Chức năng
- Mở API Flask tại `/api/chatbot`.
- Dùng tool để tìm phim, lấy transcript và trả lời câu hỏi.
- Làm việc với MongoDB collections: `movies`, `video_vectors`, `movie_embeddings`.

## Yêu cầu
- Python 3
- Cài dependencies từ `ai/requirements.txt`
- MongoDB chạy tại `mongodb://localhost:27017/`

## Biến môi trường
Các biến thường dùng (không bắt buộc trừ khi có ghi chú):
- `LLM_PROVIDER` (mặc định: `gemini`, dùng `llama_cpp` cho model local)
- `LLAMA_MODEL_PATH` (bắt buộc nếu `LLM_PROVIDER=llama_cpp`)
- `LLAMA_N_CTX`, `LLAMA_MAX_TOKENS`, `LLAMA_TEMPERATURE`
- `AI_CHATBOT_PORT` (mặc định: `5005`)

## Chạy
Từ thư mục gốc repo:
```
python ai/chatbot/api_chatbot.py
```

Health check:
```
GET http://127.0.0.1:5005/api/chatbot/health
```

## Đồng bộ dữ liệu (tuỳ chọn)
Nếu có JSON transcript trong `ai/chatbot/data/<slug>/`, chạy:
```
python ai/chatbot/sync_db.py
```
Lệnh này sẽ insert vectors vào `video_vectors`.

## Ghi chú
- Model local chạy chậm thì giảm `LLAMA_MAX_TOKENS` hoặc `LLAMA_N_CTX`.
- Nếu trả lời rỗng, kiểm tra dữ liệu Mongo cho phim/tập.
