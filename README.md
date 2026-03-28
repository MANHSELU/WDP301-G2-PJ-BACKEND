# Bus Management System - Backend

## 📋 Tổng quan

Hệ thống quản lý xe bus và giao hàng là một nền tảng toàn diện cho việc đặt vé xe, quản lý chuyến đi, và dịch vụ giao hàng. Backend được xây dựng bằng Node.js, Express.js và MongoDB, cung cấp RESTful APIs cho frontend và các dịch vụ khác.

## 🚀 Tính năng chính

### 👥 Quản lý người dùng
- **Đăng ký/Đăng nhập**: Hỗ trợ đa vai trò (Customer, Driver, Assistant Driver, Receptionist, Admin)
- **Xác thực**: JWT token, bcrypt hashing
- **Quản lý profile**: Cập nhật thông tin cá nhân, đổi mật khẩu
- **Quên mật khẩu**: Reset password qua email

### 🎫 Đặt vé xe
- **Xem chuyến đi**: Tìm kiếm và xem các chuyến xe có sẵn
- **Đặt vé**: Đặt vé cho khách hàng với thông tin chi tiết
- **Hủy vé**: Hủy vé đã đặt
- **Xem vé**: Xem lịch sử đặt vé
- **Thanh toán**: Tích hợp thanh toán online và COD

### 📦 Dịch vụ giao hàng
- **Đặt hàng**: Tạo đơn giao hàng cho các sản phẩm
- **Theo dõi**: Tra cứu đơn hàng bằng mã tracking
- **Cập nhật trạng thái**: Cập nhật tiến độ giao hàng
- **Hủy đơn**: Hủy đơn hàng

### 🚐 Quản lý chuyến đi (Driver/Assistant Driver)
- **Xem thông tin chuyến**: Chi tiết chuyến đi được giao
- **Cập nhật trạng thái**: Bắt đầu, đang chạy, hoàn thành
- **Check-in/out**: Check-in trước khi khởi hành, check-out sau khi kết thúc
- **Check-in khách**: Xác nhận khách lên xe
- **Xác nhận hàng hóa**: Kiểm tra hành lý và hàng ký gửi
- **Báo cáo sự cố**: Báo cáo vấn đề trong chuyến đi

### 🛠️ Quản lý hệ thống (Admin)
- **Quản lý tài khoản**: Tạo, xem, cập nhật trạng thái tài khoản staff
- **Quản lý xe bus**: Thêm, sửa thông tin xe
- **Quản lý tuyến đường**: Tạo, xem, cập nhật các tuyến xe
- **Quản lý điểm dừng**: Quản lý các điểm đón/trả
- **Quản lý chuyến đi**: Tạo và cập nhật các chuyến xe
- **Thống kê**: Xem báo cáo thống kê hệ thống

### 🔔 Thông báo
- **Thông báo hệ thống**: Gửi thông báo đến các user
- **Đánh giá**: Khách hàng đánh giá driver và dịch vụ sau chuyến đi

## 🏗️ Kiến trúc hệ thống

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ - User Interface│    │ - REST APIs     │    │ - Collections   │
│ - State Mgmt    │    │ - Auth/JWT      │    │ - Indexes       │
│ - API Calls     │    │ - Validation    │    │ - Aggregation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   External      │
                    │   Services      │
                    │                 │
                    │ - Cloudinary    │
                    │ - Email Service │
                    │ - Payment GW    │
                    └─────────────────┘
```

### API Architecture
```
Request Flow:
Client ──► Middleware ──► Route ──► Controller ──► Service ──► Model ──► Database
    ▲         │            │          │            │          │          │
    │         │            │          │            │          │          │
    └─────────┼────────────┼──────────┼────────────┼──────────┼──────────┘
          Response Flow (reverse)
```

### Security Layers
```
┌─────────────────┐
│   Client        │
└─────────────────┘
         │
    ┌────────────┐
    │ Rate Limit │
    └────────────┘
         │
    ┌────────────┐
    │   CORS     │
    └────────────┘
         │
    ┌────────────┐
    │ Auth/JWT   │
    └────────────┘
         │
    ┌────────────┐
    │Validation  │
    └────────────┘
         │
    ┌────────────┐
    │ Controller │
    └────────────┘
```

## 📊 Cơ sở dữ liệu

### Các collection chính

#### 👥 Users Collection
```javascript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  avatar: { type: String }, // Cloudinary URL
  role: { type: ObjectId, ref: 'Role', required: true },
  status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### 🎫 BookingOrder Collection
```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'Users', required: true },
  tripId: { type: ObjectId, ref: 'Trip', required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### 🚐 Trip Collection
```javascript
{
  _id: ObjectId,
  routeId: { type: ObjectId, ref: 'Routers', required: true },
  busId: { type: ObjectId, ref: 'Bus', required: true },
  driverId: { type: ObjectId, ref: 'Users', required: true },
  assistantDriverId: { type: ObjectId, ref: 'Users' },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'departed', 'arrived', 'cancelled'], default: 'scheduled' },
  availableSeats: { type: Number, required: true },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

#### 📦 Parcel Collection
```javascript
{
  _id: ObjectId,
  trackingNumber: { type: String, required: true, unique: true },
  senderName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  senderAddress: { type: String, required: true },
  receiverName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  receiverAddress: { type: String, required: true },
  packageType: { type: String, enum: ['document', 'package', 'fragile'], required: true },
  weight: { type: Number, required: true },
  value: { type: Number, default: 0 },
  description: { type: String },
  status: { type: String, enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Database Relationships
```
Users (role) ────→ Roles
Users (driverId) ──→ Users (self-reference)
Users (assistantDriverId) ──→ Users (self-reference)

BookingOrder ────→ Users
BookingOrder ────→ Trip
Booking_Order_detail ────→ BookingOrder
Booking_Order_detail ────→ StopLocation

Trip ────→ Routers
Trip ────→ Bus
Trip ────→ Users (driver)
Trip ────→ Users (assistant)

Routers ────→ Stops (from)
Routers ────→ Stops (to)
RouteStops ────→ Routers
RouteStops ────→ Stops

Bus ────→ BusType
Bus ────→ Users (assigned driver)

Parcel ────→ Users (created by)
ParcelStatusLog ────→ Parcel

TripReview ────→ Trip
TripReview ────→ Users
```

### Indexes
```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 });
db.users.createIndex({ role: 1 });

// Trips collection
db.trips.createIndex({ routeId: 1 });
db.trips.createIndex({ departureTime: 1 });
db.trips.createIndex({ status: 1 });

// Bookings collection
db.bookingorders.createIndex({ userId: 1 });
db.bookingorders.createIndex({ tripId: 1 });
db.bookingorders.createIndex({ status: 1 });

// Parcels collection
db.parcels.createIndex({ trackingNumber: 1 }, { unique: true });
db.parcels.createIndex({ status: 1 });
```

## 🔧 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- MongoDB >= 4.0
- npm hoặc yarn

### Cài đặt
```bash
# Clone repository
git clone <repository-url>
cd Backend

# Install dependencies
npm install
```

### Cấu hình
1. Tạo file `.env` trong thư mục root:
```env
# Database Configuration
MONGODB_URL=mongodb://localhost:27017/bus_management
MONGODB_TEST_URL=mongodb://localhost:27017/bus_management_test

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_key
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Cloudinary Configuration (File Upload)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Payment Configuration (if using payment gateway)
PAYMENT_GATEWAY_KEY=your_payment_key
PAYMENT_GATEWAY_SECRET=your_payment_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# Google Maps API (for distance calculation)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

2. Đảm bảo MongoDB đang chạy trên port 27017 (hoặc cấu hình URL tương ứng)

### Chạy ứng dụng
```bash
# Development mode với auto-reload
npm start

# Hoặc chạy trực tiếp
node Server.js
```

### Seeding database
```bash
# Seed data mẫu
node src/seeds/import-from-json-seeder.js

# Hoặc seed staff từ JSON
node src/seeds/import-staff-from-json.js
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Hầu hết APIs yêu cầu JWT token trong header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "error": null
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Dữ liệu đầu vào không hợp lệ | 400 |
| `UNAUTHORIZED` | Chưa đăng nhập hoặc token hết hạn | 401 |
| `FORBIDDEN` | Không có quyền truy cập | 403 |
| `NOT_FOUND` | Không tìm thấy tài nguyên | 404 |
| `CONFLICT` | Dữ liệu bị xung đột | 409 |
| `RATE_LIMIT_EXCEEDED` | Vượt quá giới hạn request | 429 |
| `INTERNAL_ERROR` | Lỗi server nội bộ | 500 |

### Chi tiết API Endpoints

#### 🔐 Authentication APIs

**POST /auth/register**
- **Description**: Đăng ký tài khoản mới
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "role": "customer"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "customer"
    },
    "token": "jwt_token_here"
  }
}
```

**POST /auth/login**
- **Description**: Đăng nhập
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "customer"
    },
    "token": "jwt_token_here"
  }
}
```

#### 👤 User Management APIs

**GET /users/profile**
- **Description**: Lấy thông tin profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "avatar": "cloudinary_url",
    "role": "customer",
    "status": "active"
  }
}
```

**PUT /users/profile**
- **Description**: Cập nhật profile
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "fullName": "Nguyễn Văn B",
  "phone": "0987654321"
}
```

#### 🎫 Booking APIs

**GET /bookings**
- **Description**: Lấy danh sách vé đã đặt
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `page=1&limit=10&status=confirmed`
- **Response**:
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking_id",
        "tripId": "trip_id",
        "seats": ["A1", "A2"],
        "totalPrice": 300000,
        "status": "confirmed",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

**POST /bookings**
- **Description**: Đặt vé mới
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "tripId": "trip_id",
  "seats": ["A1", "A2"],
  "passengerInfo": [
    {
      "name": "Nguyễn Văn A",
      "phone": "0123456789",
      "idCard": "123456789"
    }
  ],
  "paymentMethod": "online"
}
```

#### 📦 Parcel APIs

**POST /parcels**
- **Description**: Tạo đơn hàng giao hàng
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "senderName": "Người gửi",
  "senderPhone": "0123456789",
  "senderAddress": "Địa chỉ gửi",
  "receiverName": "Người nhận",
  "receiverPhone": "0987654321",
  "receiverAddress": "Địa chỉ nhận",
  "packageType": "document",
  "weight": 1.5,
  "value": 500000,
  "description": "Gói hàng quan trọng"
}
```

#### 🚐 Trip Management APIs

**GET /trips**
- **Description**: Tìm kiếm chuyến đi
- **Query Params**: `from=Hanoi&to=HCMC&date=2024-01-01&page=1&limit=10`
- **Response**:
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "trip_id",
        "route": {
          "from": "Hanoi",
          "to": "HCMC",
          "distance": 1500
        },
        "bus": {
          "id": "bus_id",
          "type": "Giường nằm",
          "totalSeats": 40
        },
        "departureTime": "2024-01-01T06:00:00Z",
        "arrivalTime": "2024-01-01T18:00:00Z",
        "price": 300000,
        "availableSeats": 35
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50
    }
  }
}
```

#### 👑 Admin APIs

**GET /admin/users**
- **Description**: Quản lý users (Admin only)
- **Headers**: `Authorization: Bearer <admin_token>`
- **Query Params**: `page=1&limit=10&role=driver&status=active&search=john`
- **Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "driver@example.com",
        "fullName": "John Doe",
        "role": "driver",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  }
}
```

**POST /admin/users**
- **Description**: Tạo tài khoản staff (Admin only)
- **Headers**: `Authorization: Bearer <admin_token>`
- **Body**:
```json
{
  "email": "newstaff@example.com",
  "password": "TempPass123!",
  "fullName": "New Staff",
  "phone": "0123456789",
  "role": "receptionist"
}
```

**GET /admin/statistics**
- **Description**: Thống kê hệ thống (Admin only)
- **Headers**: `Authorization: Bearer <admin_token>`
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalTrips": 450,
    "totalBookings": 3200,
    "totalRevenue": 960000000,
    "monthlyStats": {
      "bookings": 320,
      "revenue": 96000000
    }
  }
}
```

## 🔐 Bảo mật

- **JWT Authentication**: Bảo vệ APIs với token
- **Password Hashing**: Sử dụng bcrypt với salt rounds = 10
- **Rate Limiting**: Giới hạn 100 requests/phút per IP
- **CORS**: Chỉ cho phép origins được cấu hình
- **Input Validation**: Validate tất cả inputs
- **File Upload Security**: Chỉ cho phép định dạng ảnh an toàn

## 🧪 Testing

### Tài khoản test
Sau khi seed database:
- **Admin**: admin@example.com / Password123!
- **Receptionist**: recep1@example.com / Password123!
- **Driver**: driver1@example.com / Password123!
- **Customer**: customer1@example.com / Password123!

### API Testing
Sử dụng Postman hoặc curl để test APIs:
```bash
# Login example
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}'
```

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Cấu hình MongoDB production
3. Setup Cloudinary cho file uploads
4. Cấu hình email service
5. Enable HTTPS
6. Setup reverse proxy (nginx)

### Environment Variables Production
```env
NODE_ENV=production
MONGODB_URL=mongodb://prod-server:27017/bus_prod
JWT_SECRET=strong_production_secret
CLOUDINARY_CLOUD_NAME=prod_cloud
# ... other configs
```

## 📈 Performance & Optimization

### Database Optimization
- **Indexes**: Đã tạo indexes cho các trường thường query
- **Aggregation Pipeline**: Sử dụng cho complex queries
- **Connection Pooling**: MongoDB connection pooling
- **Read Preferences**: Primary read cho consistency

### API Optimization
- **Caching**: Redis cache cho frequent queries
- **Pagination**: Cursor-based pagination cho large datasets
- **Compression**: Gzip compression cho responses
- **Rate Limiting**: Prevent abuse và DOS attacks

### Code Optimization
- **Async/Await**: Non-blocking I/O operations
- **Error Handling**: Centralized error handling middleware
- **Validation**: Input validation tại multiple layers
- **Logging**: Structured logging với Winston

### Monitoring Metrics
```javascript
// Key metrics to monitor
{
  responseTime: 'Average API response time',
  errorRate: 'API error percentage',
  throughput: 'Requests per second',
  databaseConnections: 'Active DB connections',
  memoryUsage: 'Server memory consumption',
  cpuUsage: 'Server CPU utilization'
}
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. MongoDB Connection Failed
**Error**: `MongoServerError: Authentication failed`
**Solution**:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Reset MongoDB password
mongo admin --eval "db.changeUserPassword('username', 'newpassword')"

# Check connection string in .env
MONGODB_URL=mongodb://username:password@localhost:27017/bus_management
```

#### 2. JWT Token Issues
**Error**: `JsonWebTokenError: invalid signature`
**Solution**:
- Kiểm tra `JWT_SECRET` trong .env file
- Đảm bảo secret key ít nhất 32 ký tự
- Restart server sau khi thay đổi JWT_SECRET

#### 3. File Upload Failed
**Error**: `Cloudinary upload error`
**Solution**:
- Kiểm tra Cloudinary credentials trong .env
- Đảm bảo file size < 10MB
- Check supported formats: jpg, png, jpeg, gif, webp

#### 4. Email Not Sending
**Error**: `Email service error`
**Solution**:
- Kiểm tra Gmail app password (không phải mật khẩu thường)
- Enable "Less secure app access" hoặc sử dụng OAuth2
- Check SMTP settings: smtp.gmail.com:587

#### 5. CORS Issues
**Error**: `CORS policy error`
**Solution**:
- Thêm frontend URL vào `CORS_ORIGIN` trong .env
- Restart server sau khi thay đổi CORS settings
- Check preflight requests

#### 6. Rate Limiting
**Error**: `Too many requests`
**Solution**:
- Tăng `RATE_LIMIT_MAX_REQUESTS` trong .env
- Implement exponential backoff trong client
- Check rate limit headers trong response

#### 7. Memory Leaks
**Symptoms**: Memory usage tăng dần
**Solution**:
- Monitor với `process.memoryUsage()`
- Check for circular references
- Use memory profiling tools
- Implement proper cleanup trong middleware

#### 8. Database Performance
**Issue**: Slow queries
**Solution**:
```javascript
// Add indexes for slow queries
db.collection.createIndex({ field: 1 })

// Use explain() to analyze queries
db.collection.find(query).explain('executionStats')

// Optimize aggregation pipelines
db.collection.aggregate([
  { $match: { status: 'active' } },
  { $sort: { createdAt: -1 } },
  { $limit: 10 }
])
```

### Debug Commands
```bash
# Check server logs
tail -f logs/app.log

# Test API endpoints
curl -X GET http://localhost:3000/api/health \
  -H "Authorization: Bearer <token>"

# Check database connections
db.serverStatus().connections

# Monitor memory usage
node -e "console.log(process.memoryUsage())"

# Check active requests
netstat -tlnp | grep :3000
```

### Health Check Endpoints
```javascript
// GET /api/health
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "memory": {
    "used": "150MB",
    "free": "850MB"
  },
  "database": {
    "status": "connected",
    "collections": 15
  }
}
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Tạo Pull Request

## 📝 License

ISC License

## 👥 Authors

- Development Team

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Trang hiện tại |
| limit | number | 10 | Số item/trang |
| status | string | - | active / inactive / banned |
| role | string | - | Role ID |
| search | string | - | Tìm theo tên hoặc SĐT |

**Ví dụ:**

```
GET /api/admin/check/accounts?page=1&limit=10&status=active&search=admin
Authorization: Bearer <token>
```

### 1.2. Lấy chi tiết account

| Method | Endpoint                        | Auth        |
| ------ | ------------------------------- | ----------- |
| GET    | `/api/admin/check/accounts/:id` | ✅ Required |

**Ví dụ:**

```
GET /api/admin/check/accounts/698b5a9e4117ccd606601d7d
Authorization: Bearer <token>
```

---

## 2. UPDATE BUS

### 2.1. Lấy chi tiết bus

| Method | Endpoint                     | Auth        |
| ------ | ---------------------------- | ----------- |
| GET    | `/api/admin/check/buses/:id` | ✅ Required |

### 2.2. Cập nhật thông tin bus

| Method | Endpoint                     | Auth        |
| ------ | ---------------------------- | ----------- |
| PUT    | `/api/admin/check/buses/:id` | ✅ Required |

**Request Body:**

```json
{
  "license_plate": "51B-999.99",
  "status": "MAINTENANCE"
}
```

### 2.3. Cập nhật trạng thái bus

| Method | Endpoint                            | Auth        |
| ------ | ----------------------------------- | ----------- |
| PATCH  | `/api/admin/check/buses/:id/status` | ✅ Required |

**Bật bus:**

```json
{
  "status": "ACTIVE"
}
```

**Tắt bus:**

```json
{
  "status": "MAINTENANCE"
}
```

### 2.4. Cập nhật seat layout

| Method | Endpoint                                 | Auth        |
| ------ | ---------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/buses/:id/seat-layout` | ✅ Required |

**Request Body:**

```json
{
  "seat_layout": {
    "template_name": "Giường nằm 40 chỗ VIP",
    "floors": 2,
    "rows": 10,
    "columns": [
      { "name": "LEFT", "seats_per_row": 1 },
      { "name": "RIGHT", "seats_per_row": 1 }
    ],
    "total_seats": 40
  }
}
```

---

## 3. VIEW BUS ROUTE

### 3.1. Lấy danh sách routes (Public)

| Method | Endpoint                        | Auth            |
| ------ | ------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes` | ❌ Not Required |

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Trang hiện tại |
| limit | number | Số item/trang |
| search | string | Tìm theo tên |

**Ví dụ:**

```
GET /api/customer/notcheck/routes?page=1&limit=10&search=Hà Nội
```

### 3.2. Lấy chi tiết route (Public)

| Method | Endpoint                            | Auth            |
| ------ | ----------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes/:id` | ❌ Not Required |

### 3.3. Tìm kiếm routes theo điểm đi/đến

| Method | Endpoint                               | Auth            |
| ------ | -------------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes/search` | ❌ Not Required |

**Ví dụ:**

```
GET /api/customer/notcheck/routes/search?from=<stopId>&to=<stopId>
```

### 3.4. Lấy danh sách stops

| Method | Endpoint                       | Auth            |
| ------ | ------------------------------ | --------------- |
| GET    | `/api/customer/notcheck/stops` | ❌ Not Required |

### 3.5. Lấy routes (Admin - bao gồm inactive)

| Method | Endpoint                  | Auth        |
| ------ | ------------------------- | ----------- |
| GET    | `/api/admin/check/routes` | ✅ Required |

**Ví dụ:**

```
GET /api/admin/check/routes?page=1&limit=10&is_active=false
Authorization: Bearer <token>
```

### 3.6. Chi tiết route (Admin)

| Method | Endpoint                      | Auth        |
| ------ | ----------------------------- | ----------- |
| GET    | `/api/admin/check/routes/:id` | ✅ Required |

---

## 4. UPDATE BUS ROUTE

### 4.1. Cập nhật route

| Method | Endpoint                      | Auth        |
| ------ | ----------------------------- | ----------- |
| PUT    | `/api/admin/check/routes/:id` | ✅ Required |

**Request Body:**

```json
{
  "distance_km": 800,
  "is_active": true
}
```

### 4.2. Bật/Tắt route

| Method | Endpoint                             | Auth        |
| ------ | ------------------------------------ | ----------- |
| PATCH  | `/api/admin/check/routes/:id/status` | ✅ Required |

**Bật route:**

```json
{
  "is_active": true
}
```

**Tắt route:**

```json
{
  "is_active": false
}
```

---

## 5. UPDATE BUS ROUTE NODE

### 5.1. Thêm stop mới vào route

| Method | Endpoint                                 | Auth        |
| ------ | ---------------------------------------- | ----------- |
| POST   | `/api/admin/check/routes/:routeId/stops` | ✅ Required |

**Thêm vào vị trí cụ thể:**

```json
{
  "stop_id": "<stop_id>",
  "stop_order": 3,
  "is_pickup": true
}
```

**Thêm vào cuối:**

```json
{
  "stop_id": "<stop_id>",
  "is_pickup": true
}
```

### 5.2. Đổi thứ tự stop

| Method | Endpoint                                               | Auth        |
| ------ | ------------------------------------------------------ | ----------- |
| PUT    | `/api/admin/check/routes/:routeId/stops/:stopId/order` | ✅ Required |

**Request Body:**

```json
{
  "new_order": 2
}
```

> Hệ thống tự động reorder các stops khác

### 5.3. Bật/Tắt pickup

| Method | Endpoint                                                | Auth        |
| ------ | ------------------------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/routes/:routeId/stops/:stopId/pickup` | ✅ Required |

**Bật:**

```json
{
  "is_pickup": true
}
```

**Tắt:**

```json
{
  "is_pickup": false
}
```

### 5.4. Thêm location cho stop

| Method | Endpoint                                                   | Auth        |
| ------ | ---------------------------------------------------------- | ----------- |
| POST   | `/api/admin/check/routes/:routeId/stops/:stopId/locations` | ✅ Required |

**Request Body:**

```json
{
  "name": "Bến xe ABC",
  "address": "123 Đường XYZ, Quận 1",
  "latitude": 10.8231,
  "longitude": 106.6297,
  "type": "BOTH"
}
```

**Type values:** `PICKUP` | `DROPOFF` | `BOTH`

### 5.5. Cập nhật location

| Method | Endpoint                         | Auth        |
| ------ | -------------------------------- | ----------- |
| PUT    | `/api/admin/check/locations/:id` | ✅ Required |

**Request Body:**

```json
{
  "name": "Bến xe Mỹ Đình - Updated",
  "address": "20 Phạm Hùng, Hà Nội",
  "latitude": 21.029,
  "longitude": 105.783,
  "type": "PICKUP"
}
```

### 5.6. Bật/Tắt location

| Method | Endpoint                                | Auth        |
| ------ | --------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/locations/:id/status` | ✅ Required |

**Bật:**

```json
{
  "is_active": true
}
```

**Tắt:**

```json
{
  "is_active": false
}
```

---

## 6. DELETE BUS ROUTE NODE

### 6.1. Xóa stop khỏi route

| Method | Endpoint                                         | Auth        |
| ------ | ------------------------------------------------ | ----------- |
| DELETE | `/api/admin/check/routes/:routeId/stops/:stopId` | ✅ Required |

> ⚠️ Route phải có ít nhất 2 stops. Xóa stop sẽ tự động xóa locations và reorder.

### 6.2. Xóa location

| Method | Endpoint                         | Auth        |
| ------ | -------------------------------- | ----------- |
| DELETE | `/api/admin/check/locations/:id` | ✅ Required |

> ⚠️ Mỗi stop phải có ít nhất 1 active location

---

## 📊 Tổng hợp API Endpoints

### Account Management

| Method | Endpoint                        | Description        |
| ------ | ------------------------------- | ------------------ |
| GET    | `/api/admin/check/accounts`     | Danh sách accounts |
| GET    | `/api/admin/check/accounts/:id` | Chi tiết account   |

### Bus Management

| Method | Endpoint                                 | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/api/admin/check/buses/:id`             | Chi tiết bus         |
| PUT    | `/api/admin/check/buses/:id`             | Cập nhật bus         |
| PATCH  | `/api/admin/check/buses/:id/status`      | Cập nhật status      |
| PATCH  | `/api/admin/check/buses/:id/seat-layout` | Cập nhật seat layout |

### Bus Route Management

| Method | Endpoint                               | Description               |
| ------ | -------------------------------------- | ------------------------- |
| GET    | `/api/customer/notcheck/routes`        | Danh sách routes (public) |
| GET    | `/api/customer/notcheck/routes/:id`    | Chi tiết route (public)   |
| GET    | `/api/customer/notcheck/routes/search` | Tìm kiếm routes           |
| GET    | `/api/customer/notcheck/stops`         | Danh sách stops           |
| GET    | `/api/admin/check/routes`              | Danh sách routes (admin)  |
| GET    | `/api/admin/check/routes/:id`          | Chi tiết route (admin)    |
| PUT    | `/api/admin/check/routes/:id`          | Cập nhật route            |
| PATCH  | `/api/admin/check/routes/:id/status`   | Bật/tắt route             |

### Route Node Management

| Method | Endpoint                                                   | Description       |
| ------ | ---------------------------------------------------------- | ----------------- |
| POST   | `/api/admin/check/routes/:routeId/stops`                   | Thêm stop         |
| DELETE | `/api/admin/check/routes/:routeId/stops/:stopId`           | Xóa stop          |
| PUT    | `/api/admin/check/routes/:routeId/stops/:stopId/order`     | Đổi thứ tự        |
| PATCH  | `/api/admin/check/routes/:routeId/stops/:stopId/pickup`    | Bật/tắt pickup    |
| POST   | `/api/admin/check/routes/:routeId/stops/:stopId/locations` | Thêm location     |
| PUT    | `/api/admin/check/locations/:id`                           | Cập nhật location |
| PATCH  | `/api/admin/check/locations/:id/status`                    | Bật/tắt location  |
| DELETE | `/api/admin/check/locations/:id`                           | Xóa location      |

---

## 🧪 Test Accounts

| Name           | Phone      | Password | Role             |
| -------------- | ---------- | -------- | ---------------- |
| Admin System   | 0900000001 | 123456   | admin            |
| Admin Manager  | 0900000002 | 123456   | admin            |
| Nguyen Van A   | 0911111111 | 123456   | customer         |
| Tran Thi B     | 0911111112 | 123456   | customer         |
| Tai Xe Minh    | 0922222221 | 123456   | driver           |
| Tai Xe Hung    | 0922222222 | 123456   | driver           |
| Le Nhan Vien A | 0933333331 | 123456   | receptionist     |
| Phu Xe Anh     | 0944444441 | 123456   | assistant_driver |
