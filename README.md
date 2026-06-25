# PCCC News Radar V1.0.0

**PCCC News Radar** là mini app PWA tĩnh hỗ trợ theo dõi tin tức PCCC/CNCH, nguồn chính thống, mô hình hay, công nghệ mới, trang bị/kiểm định, thiết bị truyền tin báo cháy và dữ liệu cơ sở.

App ưu tiên phong cách đọc tin hiện đại kiểu app mobile: feed card, tab chuyên mục ngang, đọc bài riêng, lưu offline, xuất PDF đẹp và copy/chia sẻ Zalo thủ công.

## Mục tiêu

- Gom và phân loại thông tin liên quan PCCC/CNCH.
- Ưu tiên nguồn chính thống trong nước và nguồn kỹ thuật quốc tế.
- Lưu bài viết/hồ sơ để đọc offline.
- Xuất PDF dạng hồ sơ nghiệp vụ đẹp.
- Copy bản tin ngắn để gửi Zalo.
- Quản lý nhanh bình chữa cháy, tem kiểm định, thiết bị truyền tin, hồ sơ cơ sở.

## Nguyên tắc an toàn

- PWA tĩnh: HTML/CSS/JavaScript thuần.
- Không backend trong V1.0.
- Không database server.
- Không yêu cầu đăng nhập.
- Không private API.
- Không tracking người dùng.
- Không cào Facebook trái phép.
- Không tự động đăng/chia sẻ vào Zalo.
- Dữ liệu lưu cục bộ bằng IndexedDB và localStorage.

## Cách chạy local

Dùng một HTTP server tĩnh. Ví dụ với Python:

```bash
python -m http.server 5173
```

Mở:

```txt
http://localhost:5173
```

Không nên mở trực tiếp `file://` vì service worker/PWA cần HTTP hoặc HTTPS.

## Cách test

```bash
npm run check
npm run validate
```

## Deploy Vercel

```bash
npm run check
npm run validate
git status
git add .
git commit -m "Release V1.0.0 PCCC News Radar"
git push origin main
npx vercel --prod
```

## Deploy GitHub Pages

Có thể bật GitHub Pages từ branch `main`, thư mục root.

## Cách dùng nhanh

1. Mở app, xem tab **Tất cả** hoặc chọn chuyên mục.
2. Bấm **Cập nhật** để thử lấy RSS/public feed từ nguồn cấu hình.
3. Nếu nguồn không cho đọc trực tiếp, dùng **Nguồn nhanh & tìm kiếm chính thống** để mở link/tìm thủ công.
4. Bấm **Đọc** để xem chi tiết.
5. Bấm **Lưu offline** để lưu vào kho.
6. Vào tab **Đã lưu** để đọc lại khi mất mạng.
7. Bấm **Xuất PDF** để in/lưu PDF đẹp.
8. Bấm **Copy Zalo** hoặc **Chia sẻ** để gửi nội dung thủ công qua Zalo.
9. Bấm **＋ Hồ sơ thiết bị** để lưu bình chữa cháy, tem kiểm định, thiết bị truyền tin hoặc hồ sơ cơ sở.
10. Dùng **Xuất JSON** để sao lưu toàn bộ dữ liệu.

## Giới hạn V1.0

- Một số website/RSS/Facebook có thể chặn đọc trực tiếp do CORS hoặc chính sách nền tảng.
- Facebook chỉ hỗ trợ mở nguồn/tìm nhanh/lưu link/dán nội dung thủ công; không cào dữ liệu.
- Zalo dùng Web Share API hoặc copy thủ công; không tự động gửi tin.
- PDF dùng Print CSS + Save as PDF của trình duyệt.
- Nội dung nghiệp vụ trong app là hỗ trợ ghi nhớ/tham khảo, không thay thế văn bản pháp luật hoặc kết luận chính thức.

## Dữ liệu lưu trữ

- localStorage:
  - `pccc_radar_settings`
  - `pccc_radar_version`
  - `pccc_radar_history`
- IndexedDB:
  - DB: `pccc_news_radar_db`
  - Store: `articles`
  - Store: `equipment`

## Cấu trúc file

```txt
/
  index.html
  style.css
  app.js
  manifest.json
  service-worker.js
  README.md
  CHANGELOG.md
  package.json
  data/
    sources.json
    keywords.json
    playbooks.json
  assets/
    icon.svg
  tools/
    validate-app.js
```

## Version

V1.0.0 — BAOMOI STYLE + OFFLINE PDF + ZALO + FB + TECH + COMPLIANCE.

**Tin phải nhanh, nguồn phải sạch, bài học phải lưu.**
"# pcccvinh" 
