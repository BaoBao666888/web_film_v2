# Lumi AI Cinema – Hướng dẫn tổng

Repo gồm 2 phần:
- `web-film-app/`: Frontend Vite + React + Tailwind. Chi tiết xem `web-film-app/README.md` (có hướng dẫn Xem chung, cache HLS, cách chạy).
- `backend/`: Backend Express + MongoDB. Chi tiết xem `backend/README.md` (API phim, auth/admin, watch-party, HLS proxy cache).

Tập tin `lumi_ai.movies.json` chứa dữ liệu phim mẫu.

## Ghi chú quan trọng

- Bật MongoDB replica set khi chạy backend nếu dùng tính năng admin điều chỉnh số dư. Lý do: cần transaction để cập nhật đồng thời số dư admin + user; nếu không sẽ từ chối giao dịch.
