# Database Seeder from JSON Files

Hệ thống seeder này cho phép export dữ liệu từ MongoDB thành file JSON, sau đó import vào database khác để chia sẻ dữ liệu mẫu.

## Cách sử dụng

### 1. Export dữ liệu từ database nguồn

Chạy script export để tạo file JSON:

```bash
node src/seeds/export-data.js
```

File JSON sẽ được tạo trong folder `src/seeds/exports/`.

### 2. Import dữ liệu vào database đích

Copy folder `src/seeds/exports/` và file `src/seeds/import-from-json-seeder.js` vào project đích.

Sau đó chạy:

```bash
node src/seeds/import-from-json-seeder.js
```

**Lưu ý:** Đảm bảo biến môi trường `MONGODB_URL` trong file `.env` trỏ đến database đích.

## Files được tạo

### Export files (trong `exports/`):
- `roles.json`
- `bustypes.json`
- `stops.json`
- `stoplocations.json`
- `buses.json`
- `users.json`
- `routes.json`
- `routestops.json`
- `pricingconfigs.json`
- `routesegmentprices.json`
- `trips.json`
- `bookingorders.json`
- `booking_order_details.json`
- `bookinglocations.json`
- `bookingpayments.json`
- `parcels.json`
- `paymenttransactions.json`
- `parcelstatuslogs.json`
- `tripreviews.json`
- `luggagelogs.json`
- `reportissuebuses.json`

### Scripts:
- `export-data.js`: Export data từ DB hiện tại
- `import-from-json-seeder.js`: Import data từ JSON files

## Tính năng

- **Export sạch**: Loại bỏ `_id`, `created_at`, `updated_at` để tránh conflict
- **Import thông minh**: Tự động map references giữa các documents
- **Hash password**: Tự động hash password khi import users
- **Thứ tự import**: Tuân theo dependencies để tránh lỗi reference
- **Clear DB**: Xóa dữ liệu cũ trước khi import

## Tài khoản test sau import

- **Admin**: admin@example.com / Password123!
- **Receptionist**: recep1@example.com / Password123!
- **Driver**: driver1@example.com / Password123!
- **Customer**: customer1@example.com / Password123!

## Lưu ý

- Đảm bảo MongoDB connection string đúng trong `.env`
- File JSON chứa data mẫu, có thể chỉnh sửa trước khi import
- Import sẽ xóa toàn bộ dữ liệu cũ trong database đích