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
- `JWT_SECRET` nên đặt trong `.env` (mặc định `supersecretkey`). Khi triển khai thật cần giá trị riêng/khóa an toàn.

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

### Quản lý phim nâng cao
- **Ẩn/hiện phim với lịch tự động**:
  - `POST /api/admin/movies/:id/toggle-visibility` – Ẩn hoặc hiện phim
  - Hỗ trợ set `unhideDate` để tự động mở lại phim vào thời gian định trước
  - Job tự động chạy mỗi giờ kiểm tra và mở phim đã đến hạn
  - Phim ẩn không xuất hiện trong API public (listMovies, getMovie, trending, etc.)

- **Upload file từ máy**:
  - `POST /api/upload/single` – Upload poster/thumbnail/video từ máy
  - Giới hạn: 2GB/file
  - Format hỗ trợ: JPG, PNG, WEBP, MP4, WEBM, MOV, AVI, MKV
  - File lưu tại `/backend/uploads/` và serve qua `/uploads/:filename`

- **Auto-handle duplicate ID**: Tự động thêm `-2`, `-3`... vào ID nếu trùng (thử tối đa 10 lần)

### Xem chung (watch-party)
- Model `WatchParty` lưu phòng (host, participants, state phát, chat, quyền điều khiển/tải, private/public).
- Router `/api/watch-party`:
  - `POST /api/watch-party` tạo phòng (public/private, quyền điều khiển/tải, auto-start).
  - `GET /api/watch-party/public` / `GET /api/watch-party/private?viewerId=...` lấy phòng public hoặc private người dùng truy cập được.
  - `GET /api/watch-party/:id` lấy chi tiết phòng (tự loại viewer hết hạn).
  - `POST /api/watch-party/:id/join` + `POST /api/watch-party/:id/heartbeat` duy trì participants và chuyển host khi host rời.
  - `POST /api/watch-party/:id/state` lưu state play/pause/seek/tốc độ (chỉ host nếu không bật allowViewerControl).
  - `POST /api/watch-party/:id/chat` lưu chat (cắt 50 tin gần nhất).
  - `PATCH /api/watch-party/:id/settings` chỉnh allowViewerControl/allowDownload (host).
  - `DELETE /api/watch-party/:id` host xóa phòng.
- HLS proxy (`/api/hls/proxy`) có cache segment 5 phút (~80MB/500 mục) để giảm tải nguồn phim cho phòng xem chung.

## Ghi chú

- File seed nằm tại `src/seeds/*`. Khi cần reset dữ liệu, xóa các collection tương ứng hoặc chạy lại `npm run seed` sau khi drop DB.
- Middleware `verifyToken` và `requireAdmin` đang dùng JWT đơn giản. Khi triển khai production cần bổ sung refresh token, expiry, revoke list...
- Một số tính năng AI/chatbot chỉ mock dữ liệu. Thay bằng service thật bằng cách sửa `src/routes/ai.js`.
