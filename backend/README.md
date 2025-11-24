# Lumi AI Backend

Express API kết nối MongoDB (Mongoose) phục vụ toàn bộ tính năng phim/AI/Admin cho Lumi AI Cinema.

## Thành phần chính

- `/api/movies`: CRUD phim, xem chi tiết, phát video demo, submit review. Các route POST/PUT/DELETE yêu cầu token admin.
- `/api/auth`: Đăng ký, đăng nhập (JWT), lấy profile kèm favorites + history.
- `/api/admin`: Dashboard thống kê, danh sách user/phim – đã gắn middleware `verifyToken` + `requireAdmin`.
- `/api/ai`: Recommendation/playlist/chatbot mô phỏng, dashboard số liệu.
- `/api/ratings`: Form ghi nhận đánh giá + sentiment hint (dùng chung cho Rating page).

## Yêu cầu môi trường

- Node.js >= 18 và MongoDB đang chạy (mặc định `mongodb://127.0.0.1:27017/lumi_ai`). Cập nhật URI qua biến `MONGODB_URI` trong `.env` nếu cần.
- `JWT_SECRET` có thể đặt trong `.env` (mặc định `supersecretkey`). Khi triển khai thật nên thay bằng giá trị riêng.

## Cài đặt & chạy

```bash
cd backend
npm install
npm run seed   # (tùy chọn) đổ dữ liệu mẫu vào MongoDB
npm run dev    # nodemon, cổng 4000
```

## Endpoint tiêu biểu

- `GET /api/movies` – danh sách phim (hỗ trợ `q`, `mood`, `tag`, `limit`).
- `GET /api/movies/:id` – chi tiết + reviews + suggestions.
- `GET /api/movies/:id/watch` – link video demo + “next up”.
- `POST /api/movies` – thêm phim mới (token admin).
- `PUT /api/movies/:id` – cập nhật phim (token admin, dùng cho form “Sửa”).  
- `POST /api/ai/chat` – trả lời giả lập, trả về gợi ý phim.
- `POST /api/ratings` – lưu đánh giá + sentiment sơ bộ.
- `GET /api/admin/stats|users|movies` – dashboard quản trị (token admin).

## Ghi chú

- File seed nằm tại `src/seeds/*`. Khi cần reset dữ liệu, xóa các collection tương ứng hoặc chạy lại `npm run seed` sau khi drop DB.
- Middleware `verifyToken` và `requireAdmin` đang dùng JWT đơn giản. Khi triển khai production cần bổ sung refresh token, expiry, revoke list...
- Một số tính năng AI/chatbot chỉ mock dữ liệu. Thay bằng service thật bằng cách sửa `src/routes/ai.js`.
