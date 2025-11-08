# Lumi AI Backend

API Express lưu dữ liệu trong file JSON (`data/lumi_ai.json`). Phục vụ các nhóm tính năng:

- `/api/movies`: CRUD phim, xem chi tiết, phát video demo.
- `/api/ai/*`: Recommendation, chatbot, dashboard số liệu (mock AI).
- `/api/ratings`, `/api/auth/*`, `/api/admin/*`: Đánh giá, profile người dùng, dashboard quản trị.

## Chạy dự án

```bash
npm install
npm run dev   # nodemon, cổng 4000
```

Các endpoint chính:

- `GET /api/movies` – danh sách phim (hỗ trợ `q`, `mood`, `tag`, `limit`).
- `GET /api/movies/:id` – chi tiết + reviews + suggestions.
- `GET /api/movies/:id/watch` – link video demo + danh sách “next up”.
- `POST /api/movies` – thêm phim mới (dùng trong trang admin).
- `POST /api/ai/chat` – trả lời giả lập theo mood, trả về gợi ý phim.
- `POST /api/ratings` – lưu đánh giá + sentiment sơ bộ.

DB mặc định sinh dữ liệu khi chạy lần đầu (xem `src/db.js`). Nếu cần reset, xóa `backend/data/lumi_ai.json` rồi chạy lại `npm run dev`.
