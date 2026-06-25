# PCCC News Radar V1.1.1 Field Pro - Latest First Hotline

PCCC News Radar là mini app PWA phục vụ công tác PCCC và CNCH tại Việt Nam: theo dõi tin cháy nổ/CNCH, ưu tiên nguồn chính thống, lưu bài offline, xuất PDF đẹp, chia sẻ Zalo, quản lý hồ sơ vụ việc, checklist cơ sở, trang bị/kiểm định và các mốc pháp lý/dữ liệu cần nhớ.

## Tinh thần sản phẩm

- App nhỏ gọn, thực dụng, mobile-first.
- Không đăng nhập.
- Không tracking.
- Không private API.
- Không cào Facebook trái phép.
- Không tự động đăng Zalo/Facebook.
- Dữ liệu người dùng lưu cục bộ bằng IndexedDB/localStorage.
- Có export/import JSON để sao lưu.
- Có thể chạy offline sau lần mở đầu tiên.

## Chức năng chính

### 1. Radar tin nóng mới nhất
- Tin cháy, tai nạn, sự cố, CNCH mới nhất luôn được sắp đầu danh sách.
- Card đầu tiên được trình bày nổi bật với nhãn `TIN CHÁY / TAI NẠN SỰ CỐ MỚI NHẤT`.
- Mỗi tin có dòng thời gian tương đối: `vừa xong`, `cách đây X phút`, `cách đây X giờ`, `cách đây X ngày`.
- Cập nhật tin PCCC/CNCH qua Vercel Function `/api/live-news.js`.
- Fallback RSS/public feed nếu Live API lỗi.
- Nút mở nhanh Google News, nguồn Cục Cảnh sát PCCC và CNCH, Facebook search.
- Chấm mức độ: Đỏ/Cam/Vàng/Xanh.

### 2. Dashboard Field Pro
- Số tin đỏ cần đọc ngay.
- Số tin từ nguồn chính thống.
- Nguồn live đang sống/lỗi.
- Nhóm tin có thể trùng cùng một vụ việc.

### 3. Kho bài đã lưu offline
- Lưu bài/tóm tắt/nội dung dán thủ công.
- Đọc lại khi offline.
- Ghi bài học PCCC/CNCH.
- Xuất PDF bài viết.
- Copy bản tin Zalo.

### 4. Sổ vụ việc
- Tạo hồ sơ vụ cháy/nổ/CNCH.
- Lưu địa điểm, thời gian, loại hình, mức độ, nguồn, tóm tắt, bài học, việc cần theo dõi.
- Xuất PDF hồ sơ vụ việc.
- Copy nhanh gửi Zalo.

### 5. Checklist cơ sở
Mẫu sẵn:
- Nhà ở kết hợp kinh doanh.
- Chung cư mini / nhà trọ.
- Kho xưởng.
- Cơ sở có thiết bị truyền tin.

Có thể nhập checklist thủ công theo từng dòng, lưu offline, xuất PDF/copy Zalo.

### 6. Trang bị & kiểm định
- Bình chữa cháy.
- Thiết bị truyền tin báo cháy.
- Trụ nước / điểm cấp nước.
- Thiết bị thoát nạn.
- Hồ sơ cơ sở.

Lưu vị trí, mã tem/serial, ngày kiểm định/khai báo, ngày kiểm tra lại, trạng thái và ghi chú.

### 7. Mốc pháp lý / dữ liệu
- Theo dõi mốc kiểm định.
- Theo dõi mốc đọc văn bản.
- Theo dõi mốc cập nhật dữ liệu cơ sở.
- Theo dõi thiết bị truyền tin báo cháy.

### 8. PDF & Zalo Pack
- PDF bài viết.
- PDF hồ sơ vụ việc.
- PDF checklist.
- PDF hồ sơ thiết bị.
- PDF báo cáo ngày.
- Copy tin ngắn gửi Zalo.
- Copy hồ sơ/checklist/mốc gửi Zalo.

## Cấu trúc file

```txt
/
  index.html
  style.css
  app.js
  manifest.json
  service-worker.js
  package.json
  README.md
  CHANGELOG.md
  api/
    live-news.js
  assets/
    icon.svg
  data/
    sources.json
    keywords.json
    playbooks.json
  tools/
    validate-app.js
```

## Chạy local kiểu PWA tĩnh

```bash
python -m http.server 5173
```

Mở:

```txt
http://localhost:5173
```

Lưu ý: chạy kiểu này app dùng được, nhưng Vercel Function `/api/live-news.js` không chạy.

## Test Live API local

Cài/khởi động bằng Vercel CLI:

```bash
npx vercel dev
```

Sau đó mở URL local do Vercel CLI cung cấp.

## Test package

```bash
npm run check
npm run validate
```

Kết quả kỳ vọng:

```txt
PCCC NEWS RADAR V1.1.1 FIELD PRO VALIDATION PASS
```

## Deploy Vercel

```bash
npm run check
npm run validate
git status
git add .
git commit -m "Release V1.1.1 Field Pro"
git push origin main
npx vercel --prod
```

## Backup / Restore

- Bấm `Xuất JSON` để sao lưu toàn bộ bài đã lưu, thiết bị, hồ sơ vụ việc, checklist, mốc và cài đặt.
- Bấm `Nhập JSON` để khôi phục.

## Giới hạn

- Không thay thế nguồn/văn bản chính thức.
- Không tự kết luận pháp lý.
- Không cào Facebook trái phép.
- Không tự động chia sẻ Zalo.
- Một số nguồn RSS có thể lỗi/CORS; dùng nút mở tìm tin nóng hoặc dán nội dung thủ công để lưu offline.

## Version

`1.1.1 FIELD PRO`
