# Trình chạy AI tổng (ai/run_ai.py)

README này hướng dẫn chạy các service AI bằng một lệnh.

## Chạy những gì
`ai/run_ai.py` sẽ mở nhiều API:
- Chatbot (`ai/chatbot/api_chatbot.py`) tại `AI_CHATBOT_PORT` (mặc định `5005`)
- Search (`ai/search/api_search.py`) tại `AI_SEARCH_PORT` (mặc định `5001`)
- Comment filter (`ai/comment/api_comment_filter.py`) tại `AI_COMMENT_PORT` (mặc định `5002`)
- Recommend (`ai/recommend/api_main.py`) tại `AI_RECOMMEND_PORT` (mặc định `5003`)

## Chạy
Từ thư mục gốc repo:
```
python ai/run_ai.py
```

Dừng bằng `Ctrl+C`.

## Ghi chú
- Recommend chạy bằng `uvicorn` trong thư mục `ai/recommend`.
- `api_search.py` và `api_comment_filter.py` đang dùng port cứng (5001/5002).
  Nếu đổi port, hãy sửa trong các file đó.
