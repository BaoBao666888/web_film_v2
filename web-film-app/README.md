# Lumi AI Cinema – Fullstack Prototype

Frontend React (Vite + Tailwind) giao tiếp với backend Express/Mongo qua các API `/api/*`. Giao diện gồm home, tìm kiếm, phim chi tiết/xem phim, chatbot AI, trang đánh giá, hồ sơ và khu vực quản trị.

## Cấu trúc

- `src/App.tsx`: Router tổng – gom toàn bộ trang user/admin.
- `src/layouts/MainLayout.tsx`: Navbar, footer, nền gradient dùng chung.
- `src/pages/`: Các trang người dùng (`Home`, `Search`, `MovieDetail`, `Watch`, `Rating`, `Profile`, `Chat`, `Recommend`) và admin (`admin/*`).
- `src/hooks/useAuth.ts`: Quản lý token + thông tin đăng nhập (localStorage).
- `src/lib/api.ts`: Wrapper fetch – tự đính kèm header `Authorization` nếu có token.
- `src/data/movies.ts`: Dữ liệu fallback khi backend tắt.
- `backend/`: Express API (MongoDB) – cần chạy trước để front lấy dữ liệu thật.

## Chạy dự án

1. Backend (yêu cầu MongoDB chạy nền)
   ```bash
   cd backend
   npm install
   npm run seed   # tùy chọn – đổ dữ liệu mẫu (có admin@lumi.ai/admin123)
   npm run dev    # http://localhost:4000
   ```
2. Frontend
   ```bash
   cd web-film-app
   cp .env.example .env   # chỉnh VITE_API_BASE_URL nếu backend không chạy ở localhost:4000
   npm install
   npm run dev            # http://localhost:5173
   ```

Build production:
```bash
npm run build
npm run preview
```

## Chức năng đã có

- Home + recommend + chatbot mock – gọi trực tiếp `/api/movies`, `/api/ai/*`.
- Form đánh giá gửi đến `/api/ratings`.
- Đăng ký/đăng nhập lấy JWT, lưu token & user vào localStorage. Navbar/Profile phản ánh trạng thái đăng nhập.
- Admin Dashboard và Admin Manage gọi các endpoint `/api/admin/*` (yêu cầu token admin).
- Trang “Quản lý phim” có thể thêm, xóa và **sửa phim qua modal** (gọi `PUT /api/movies/:id`).

## Hướng phát triển thêm

- Tách context auth/global store để tránh reload sau khi đăng nhập.
- Bổ sung refresh token + logout backend thật, phân quyền chi tiết cho từng trang.
- Streaming video thực tế (HLS/DRM) thay vì link MP4 demo; đồng bộ lịch sử xem/favorites.
- Kết nối service AI thật (recommend/chat) và sentiment analysis thay vì mock dữ liệu.
