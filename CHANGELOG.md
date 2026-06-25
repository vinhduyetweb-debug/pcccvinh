# CHANGELOG

## V1.0.0 - 2026-06-26

### Thay đổi chính

- Tạo mới app **PCCC News Radar**.
- UI mobile-first lấy cảm hứng app đọc tin hiện đại kiểu Báo Mới, nhưng nhận diện riêng.
- Feed tin dạng card, tab chuyên mục ngang, bottom navigation.
- Nguồn nhanh: website chính thống, Facebook chính thống dạng watchlist, nguồn quốc tế/kỹ thuật.
- Kho lưu offline bằng IndexedDB.
- Dán bài thủ công để lưu toàn văn khi nguồn không cho lấy nội dung.
- Xuất PDF đẹp bằng Print CSS.
- Copy bản tin Zalo và Web Share API.
- Quản lý hồ sơ thiết bị: bình chữa cháy, kiểm định, thiết bị truyền tin, trụ nước, thiết bị thoát nạn, hồ sơ cơ sở.
- Export/import JSON toàn bộ dữ liệu.
- PWA manifest + service worker cache shell.
- Validator kiểm tra package.

### File đã tạo

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `data/sources.json`
- `data/keywords.json`
- `data/playbooks.json`
- `assets/icon.svg`
- `tools/validate-app.js`

### Test đã chạy

- `npm run check`
- `npm run validate`

### Tương thích dữ liệu

- Schema V1 dùng IndexedDB `pccc_news_radar_db` version 1.
- localStorage keys đã khóa: `pccc_radar_settings`, `pccc_radar_version`, `pccc_radar_history`.

### Ghi chú

- V1.0 không dùng backend/private API.
- Facebook/Zalo triển khai theo hướng mở nguồn, copy/chia sẻ thủ công, không tự động hóa trái phép.
