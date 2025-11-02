# Lumi AI Cinema – Web Prototype

Giao diện demo cho nền tảng xem phim ứng dụng AI. Mục tiêu hiện tại là hoàn thiện UI/UX và luồng điều hướng, backend/AI sẽ được kết nối sau.

## Cấu trúc chính

- `src/App.tsx`: Khai báo router, gom tất cả các trang.
- `src/layouts/MainLayout.tsx`: Header, footer và nền gradient dùng chung.
- `src/pages/`: Bộ trang dành cho người dùng, chatbot, rating, quản trị, v.v.
- `src/data/movies.ts`: Dữ liệu giả lập để dựng giao diện (poster, mô tả, playlist).
- `src/components/`: Navbar, footer, badge, header tái sử dụng.

## Cài đặt & chạy

```bash
npm install
npm run dev
```

Server dev mặc định ở `http://localhost:5173/`.

Để build production:

```bash
npm run build
npm run preview
```

## Ghi chú triển khai tiếp

- Kết nối API auth (NestJS/Express + JWT) cho các trang `/login`, `/register`, `/profile`, `/logout`.
- Viết service AI (FastAPI) cho recommendation/chatbot, tạo endpoint để front-end fetch dữ liệu thật thay cho mock.
- Bổ sung state loading, toast thông báo khi tích hợp backend.
- Thêm script deploy (VD: Vercel, Netlify) khi cần đưa lên môi trường staging.
