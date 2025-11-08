# Lumi AI Cinema – Fullstack Prototype

Prototype kết hợp frontend React + backend Express (JSON DB). Front hiển thị real data từ API `/api/*`, bao gồm đề xuất AI, chatbot và trang xem phim.

## Cấu trúc chính

- `src/App.tsx`: Khai báo router, gom tất cả các trang.
- `src/layouts/MainLayout.tsx`: Header, footer và nền gradient dùng chung.
- `src/pages/`: Bộ trang dành cho người dùng, chatbot, rating, quản trị, v.v.
- `src/data/movies.ts`: Dữ liệu fallback khi API tạm ngắt (poster, playlist demo).
- `src/components/`: Navbar, footer, badge, header tái sử dụng.
- `backend/`: Express server, JSON database, route AI/Movies/Auth/Admin.

## Cài đặt & chạy

1. Backend
   ```bash
   cd backend
   npm install
   npm run dev   # chạy ở http://localhost:4000
   ```
2. Frontend
   ```bash
   cd web-film-app
   cp .env.example .env
   npm install
   npm run dev   # http://localhost:5173
   ```

Để build production:

```bash
npm run build
npm run preview
```

- Nếu deploy tách biệt, cập nhật `VITE_API_BASE_URL` trong `.env`.
- Frontend gọi API qua `src/lib/api.ts`, chỉ cần đổi base URL là xong.

## Ghi chú triển khai tiếp

- Thêm bảo mật JWT + refresh token, gắn middleware cho các route `/admin/*`.
- Thay JSON DB bằng SQLite/Postgres để hỗ trợ concurrency.
- Streaming video thực tế (HLS/DRM) thay vì link MP4 demo.
- Triển khai model AI thật (recommendation + chatbot) rồi cập nhật service Python tương ứng.
