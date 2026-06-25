# CHANGELOG

## V1.1.1 LATEST FIRST HOTLINE - 2026-06-26

### Mục tiêu
Hotfix UX để tin cháy, tai nạn sự cố hoặc CNCH mới nhất luôn hiển thị đầu tiên, nổi bật như tin nóng nghiệp vụ.

### Thay đổi chính
- Tin cháy/CNCH/tai nạn/sự cố được ưu tiên lên đầu trước playbook, pháp quy, công nghệ hoặc nội dung đã lưu.
- Thêm hàm `relativeTime()` hiển thị `vừa xong`, `cách đây X phút`, `cách đây X giờ`, `cách đây X ngày`.
- Thêm card nổi bật đầu danh sách với nhãn `TIN CHÁY / TAI NẠN SỰ CỐ MỚI NHẤT`.
- Hero panel đổi sang `Tin cháy/CNCH mới nhất · cách đây...` khi có dữ liệu phù hợp.
- Feed meta hiển thị dòng `Tin cháy/CNCH mới nhất cách đây...`.
- Live API sắp xếp ưu tiên incident/rescue trước, sau đó theo thời gian mới nhất.
- Bổ sung từ khóa nhận diện: tai nạn, sự cố, thiệt mạng, mắc kẹt, tìm kiếm cứu nạn.
- Cập nhật cache PWA sang `pccc-news-radar-cache-v1.1.1`.

### File đã sửa
- `app.js`
- `style.css`
- `api/live-news.js`
- `service-worker.js`
- `package.json`
- `manifest.json`
- `tools/validate-app.js`
- `README.md`
- `CHANGELOG.md`
- `data/sources.json`

### Test đã chạy
```bash
npm run check
npm run validate
```

Kết quả:
```txt
PCCC NEWS RADAR V1.1.1 FIELD PRO VALIDATION PASS
```

### Tương thích dữ liệu
- Không phá dữ liệu cũ V1.0/V1.0.1/V1.1.0.
- Không đổi key localStorage.
- Không đổi schema IndexedDB.

## V1.1.1 FIELD PRO - 2026-06-26

### Mục tiêu
Nâng PCCC News Radar từ app đọc/lưu tin thành bộ sổ nghề PCCC/CNCH: tin nóng, nguồn sống/lỗi, chống trùng tin, hồ sơ vụ việc, checklist cơ sở, hồ sơ thiết bị, mốc pháp lý/dữ liệu, PDF và Zalo Pack.

### Thay đổi chính
- Cập nhật version lên `1.1.1`.
- Đổi cache PWA sang `pccc-news-radar-cache-v1.1.1`.
- Thêm dashboard Field Pro:
  - Tin đỏ cần đọc ngay.
  - Tin từ nguồn chính thống.
  - Nhóm tin có thể trùng vụ.
  - Tình trạng nguồn Live API/RSS.
- Thêm logic gộp/chống trùng tin theo tiêu đề/tóm tắt gần giống.
- Thêm tab `Vụ việc` để lưu hồ sơ vụ cháy/nổ/CNCH.
- Thêm tab `Checklist` với mẫu kiểm tra nhanh:
  - Nhà ở kết hợp kinh doanh.
  - Chung cư mini / nhà trọ.
  - Kho xưởng.
  - Cơ sở có thiết bị truyền tin.
- Thêm tab `Mốc` để theo dõi pháp quy, kiểm định, truyền tin báo cháy, cập nhật dữ liệu cơ sở.
- Thêm nút `Copy báo cáo ngày`.
- Thêm nút `PDF báo cáo ngày`.
- Bổ sung xuất PDF cho hồ sơ vụ việc và checklist.
- Bổ sung export/import JSON cho `incidents`, `checklistRuns`, `milestones`.
- Giữ nguyên module V1.0.1:
  - Live API `/api/live-news.js`.
  - Lưu bài offline IndexedDB.
  - Xuất PDF bài viết.
  - Copy/chia sẻ Zalo.
  - Hồ sơ thiết bị, bình chữa cháy, kiểm định, truyền tin báo cháy.

### File đã sửa
- `index.html`
- `style.css`
- `app.js`
- `service-worker.js`
- `package.json`
- `tools/validate-app.js`
- `README.md`
- `CHANGELOG.md`

### Test đã chạy
```bash
npm run check
npm run validate
```

Kết quả:
```txt
PCCC NEWS RADAR V1.1.1 FIELD PRO VALIDATION PASS
```

### Tương thích dữ liệu
- Không phá dữ liệu cũ V1.0/V1.0.1.
- IndexedDB nâng từ `DB_VERSION = 1` lên `DB_VERSION = 2` và chỉ thêm object store mới:
  - `incidents`
  - `checklistRuns`
  - `milestones`
- Các store cũ vẫn giữ:
  - `articles`
  - `equipment`

### Giới hạn
- Live API cần deploy Vercel hoặc chạy `npx vercel dev`.
- Chạy bằng `python -m http.server` vẫn dùng được app/offline shell nhưng API `/api/live-news.js` không chạy.
- Không cào Facebook trái phép.
- Không tự đăng/chia sẻ vào Zalo.
- PDF dùng Print CSS + Save as PDF của trình duyệt.

## V1.0.1 LIVE NEWS HOTFIX - 2026-06-25
- Thêm Vercel Live API lấy Google News RSS theo nhóm PCCC/CNCH.
- Thêm nút `Cập nhật nóng` và `Mở tìm tin nóng`.
- Fallback RSS/public feed khi Live API lỗi.

## V1.0.0 - 2026-06-25
- Bản nền PWA tĩnh.
- UI kiểu app đọc tin.
- Lưu bài offline.
- Xuất PDF bài viết.
- Copy Zalo/Web Share API.
- Hồ sơ thiết bị/kiểm định/truyền tin.
