const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Role = require("../model/Role");
const User = require("../model/Users");
const BusType = require("../model/BusType");
const Bus = require("../model/Bus");
const Stop = require("../model/Stops");
const Route = require("../model/Routers");
const RouteStop = require("../model/route_stops");
const StopLocation = require("../model/StopLocation");
require("dotenv").config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    // ========== SEED ROLES ==========
    console.log("📦 Seeding Roles...");
    const roles = [
      { name: "admin", description: "System administrator", isActive: true },
      { name: "customer", description: "Regular customer", isActive: true },
      { name: "driver", description: "Bus driver", isActive: true },
      {
        name: "receptionist",
        description: "Ticket receptionist",
        isActive: true,
      },
      {
        name: "assistant_driver",
        description: "Assistant driver",
        isActive: true,
      },
    ];

    for (const role of roles) {
      await Role.findOneAndUpdate({ name: role.name }, role, {
        upsert: true,
        new: true,
      });
      console.log(`   ✅ ${role.name}`);
    }

    // ========== SEED USERS ==========
    console.log("\n👥 Seeding Users...");
    const adminRole = await Role.findOne({ name: "admin" });
    const customerRole = await Role.findOne({ name: "customer" });
    const driverRole = await Role.findOne({ name: "driver" });
    const receptionistRole = await Role.findOne({ name: "receptionist" });
    const assistantDriverRole = await Role.findOne({
      name: "assistant_driver",
    });

    const hashedPassword = await bcrypt.hash("123456", 10);

    const users = [
      {
        name: "Admin System",
        phone: "0900000001",
        role: adminRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Admin Manager",
        phone: "0900000002",
        role: adminRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Nguyen Van A",
        phone: "0911111111",
        role: customerRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Tran Thi B",
        phone: "0911111112",
        role: customerRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Le Van C",
        phone: "0911111113",
        role: customerRole._id,
        status: "active",
        isVerified: false,
      },
      {
        name: "Tai Xe Minh",
        phone: "0922222221",
        role: driverRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Tai Xe Hung",
        phone: "0922222222",
        role: driverRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Le Nhan Vien A",
        phone: "0933333331",
        role: receptionistRole._id,
        status: "active",
        isVerified: true,
      },
      {
        name: "Phu Xe Anh",
        phone: "0944444441",
        role: assistantDriverRole._id,
        status: "active",
        isVerified: true,
      },
    ];

    for (const userData of users) {
      await User.findOneAndUpdate(
        { phone: userData.phone },
        { ...userData, password: hashedPassword },
        { upsert: true, new: true }
      );
      console.log(`   ✅ ${userData.name} (${userData.phone})`);
    }

    // ========== SEED BUS TYPES ==========
    console.log("\n🚌 Seeding Bus Types...");
    const busTypes = [
      {
        name: "Xe ghế ngồi 45 chỗ",
        description: "Xe khách ghế ngồi tiêu chuẩn",
        category: "SEAT",
        amenities: ["WiFi", "Điều hòa", "Nước uống"],
        isActive: true,
      },
      {
        name: "Xe giường nằm 40 chỗ",
        description: "Xe giường nằm cao cấp 2 tầng",
        category: "BED",
        amenities: ["WiFi", "Điều hòa", "Chăn gối", "Nước uống", "TV"],
        isActive: true,
      },
      {
        name: "Xe Limousine 20 chỗ",
        description: "Xe VIP hạng sang",
        category: "LIMOUSINE",
        amenities: [
          "WiFi",
          "Điều hòa",
          "Massage",
          "Nước uống",
          "Snack",
          "TV riêng",
        ],
        isActive: true,
      },
      {
        name: "Xe phòng đôi 22 chỗ",
        description: "Xe cabin phòng đôi riêng tư",
        category: "ROOM",
        amenities: ["WiFi", "Điều hòa", "Chăn gối", "Rèm che", "Ổ cắm điện"],
        isActive: true,
      },
    ];

    const createdBusTypes = {};
    for (const busType of busTypes) {
      const created = await BusType.findOneAndUpdate(
        { name: busType.name },
        busType,
        { upsert: true, new: true }
      );
      createdBusTypes[busType.category] = created;
      console.log(`   ✅ ${busType.name}`);
    }

    // ========== SEED BUSES ==========
    console.log("\n🚍 Seeding Buses...");
    const buses = [
      {
        license_plate: "51B-123.45",
        bus_type_id: createdBusTypes["SEAT"]._id,
        status: "ACTIVE",
        seat_layout: {
          template_name: "Ghế ngồi 45 chỗ tiêu chuẩn",
          floors: 1,
          rows: 11,
          columns: [
            { name: "LEFT", seats_per_row: 2 },
            { name: "RIGHT", seats_per_row: 2 },
          ],
          total_seats: 45,
        },
      },
      {
        license_plate: "51B-678.90",
        bus_type_id: createdBusTypes["BED"]._id,
        status: "ACTIVE",
        seat_layout: {
          template_name: "Giường nằm 40 chỗ 2 tầng",
          floors: 2,
          rows: 10,
          columns: [
            { name: "LEFT", seats_per_row: 1 },
            { name: "RIGHT", seats_per_row: 1 },
          ],
          total_seats: 40,
        },
      },
      {
        license_plate: "51B-111.22",
        bus_type_id: createdBusTypes["LIMOUSINE"]._id,
        status: "ACTIVE",
        seat_layout: {
          template_name: "Limousine 20 chỗ VIP",
          floors: 1,
          rows: 5,
          columns: [
            { name: "LEFT", seats_per_row: 2 },
            { name: "RIGHT", seats_per_row: 2 },
          ],
          total_seats: 20,
        },
      },
      {
        license_plate: "51B-333.44",
        bus_type_id: createdBusTypes["SEAT"]._id,
        status: "MAINTENANCE",
        seat_layout: {
          template_name: "Ghế ngồi 45 chỗ tiêu chuẩn",
          floors: 1,
          rows: 11,
          columns: [
            { name: "LEFT", seats_per_row: 2 },
            { name: "RIGHT", seats_per_row: 2 },
          ],
          total_seats: 44,
        },
      },
      {
        license_plate: "51B-555.66",
        bus_type_id: createdBusTypes["ROOM"]._id,
        status: "ACTIVE",
        seat_layout: {
          template_name: "Phòng đôi 22 chỗ",
          floors: 2,
          rows: 6,
          columns: [
            { name: "LEFT", seats_per_row: 1 },
            { name: "RIGHT", seats_per_row: 1 },
          ],
          total_seats: 22,
        },
      },
    ];

    for (const busData of buses) {
      await Bus.findOneAndUpdate(
        { license_plate: busData.license_plate },
        busData,
        { upsert: true, new: true }
      );
      console.log(`   ✅ ${busData.license_plate}`);
    }

    // ========== SEED STOPS (Điểm dừng) ==========
    console.log("\n📍 Seeding Stops...");
    const stopsData = [
      // Miền Bắc
      { name: "Hà Nội", type: "CITY", latitude: 21.0285, longitude: 105.8542 },
      {
        name: "Hải Phòng",
        type: "CITY",
        latitude: 20.8449,
        longitude: 106.6881,
      },
      {
        name: "Hải Dương",
        type: "PROVINCE",
        latitude: 20.9373,
        longitude: 106.3146,
      },
      {
        name: "Ninh Bình",
        type: "PROVINCE",
        latitude: 20.2506,
        longitude: 105.9745,
      },
      {
        name: "Nam Định",
        type: "PROVINCE",
        latitude: 20.4388,
        longitude: 106.1621,
      },
      {
        name: "Thanh Hóa",
        type: "PROVINCE",
        latitude: 19.8067,
        longitude: 105.7852,
      },
      // Miền Trung
      { name: "Vinh", type: "CITY", latitude: 18.6796, longitude: 105.6813 },
      {
        name: "Hà Tĩnh",
        type: "PROVINCE",
        latitude: 18.3559,
        longitude: 105.8877,
      },
      {
        name: "Đồng Hới",
        type: "CITY",
        latitude: 17.4694,
        longitude: 106.5991,
      },
      { name: "Huế", type: "CITY", latitude: 16.4637, longitude: 107.5909 },
      { name: "Đà Nẵng", type: "CITY", latitude: 16.0544, longitude: 108.2022 },
      {
        name: "Quảng Ngãi",
        type: "PROVINCE",
        latitude: 15.1214,
        longitude: 108.8044,
      },
      {
        name: "Quy Nhơn",
        type: "CITY",
        latitude: 13.7829,
        longitude: 109.2196,
      },
      {
        name: "Nha Trang",
        type: "CITY",
        latitude: 12.2388,
        longitude: 109.1967,
      },
      {
        name: "Phan Thiết",
        type: "CITY",
        latitude: 10.9804,
        longitude: 108.2615,
      },
      // Miền Nam
      {
        name: "Hồ Chí Minh",
        type: "CITY",
        latitude: 10.8231,
        longitude: 106.6297,
      },
      {
        name: "Vũng Tàu",
        type: "CITY",
        latitude: 10.4114,
        longitude: 107.1362,
      },
      {
        name: "Biên Hòa",
        type: "CITY",
        latitude: 10.9574,
        longitude: 106.8426,
      },
      {
        name: "Long An",
        type: "PROVINCE",
        latitude: 10.5355,
        longitude: 106.4132,
      },
      { name: "Cần Thơ", type: "CITY", latitude: 10.0452, longitude: 105.7469 },
      {
        name: "Vĩnh Long",
        type: "PROVINCE",
        latitude: 10.2397,
        longitude: 105.972,
      },
      { name: "Cà Mau", type: "PROVINCE", latitude: 9.1769, longitude: 105.15 },
      // Tây Nguyên
      { name: "Đà Lạt", type: "CITY", latitude: 11.9404, longitude: 108.4583 },
      {
        name: "Buôn Ma Thuột",
        type: "CITY",
        latitude: 12.6674,
        longitude: 108.0378,
      },
    ];

    const createdStops = {};
    for (const stopData of stopsData) {
      const stop = await Stop.findOneAndUpdate(
        { name: stopData.name },
        { ...stopData, is_active: true },
        { upsert: true, new: true }
      );
      createdStops[stopData.name] = stop;
      console.log(`   ✅ ${stopData.name} (${stopData.type})`);
    }

    // ========== SEED ROUTES (Tuyến đường) ==========
    console.log("\n🛣️ Seeding Routes...");
    const routesData = [
      {
        start: "Hà Nội",
        end: "Đà Nẵng",
        distance_km: 764,
        is_active: true,
        stops: [
          "Hà Nội",
          "Ninh Bình",
          "Thanh Hóa",
          "Vinh",
          "Hà Tĩnh",
          "Đồng Hới",
          "Huế",
          "Đà Nẵng",
        ],
      },
      {
        start: "Đà Nẵng",
        end: "Hồ Chí Minh",
        distance_km: 964,
        is_active: true,
        stops: [
          "Đà Nẵng",
          "Quảng Ngãi",
          "Quy Nhơn",
          "Nha Trang",
          "Phan Thiết",
          "Hồ Chí Minh",
        ],
      },
      {
        start: "Hà Nội",
        end: "Hồ Chí Minh",
        distance_km: 1726,
        is_active: true,
        stops: [
          "Hà Nội",
          "Vinh",
          "Huế",
          "Đà Nẵng",
          "Quy Nhơn",
          "Nha Trang",
          "Hồ Chí Minh",
        ],
      },
      {
        start: "Hà Nội",
        end: "Hải Phòng",
        distance_km: 120,
        is_active: true,
        stops: ["Hà Nội", "Hải Dương", "Hải Phòng"],
      },
      {
        start: "Hồ Chí Minh",
        end: "Cần Thơ",
        distance_km: 169,
        is_active: true,
        stops: ["Hồ Chí Minh", "Long An", "Vĩnh Long", "Cần Thơ"],
      },
      {
        start: "Hồ Chí Minh",
        end: "Đà Lạt",
        distance_km: 308,
        is_active: true,
        stops: ["Hồ Chí Minh", "Biên Hòa", "Đà Lạt"],
      },
      {
        start: "Hồ Chí Minh",
        end: "Vũng Tàu",
        distance_km: 95,
        is_active: true,
        stops: ["Hồ Chí Minh", "Biên Hòa", "Vũng Tàu"],
      },
      {
        start: "Hồ Chí Minh",
        end: "Nha Trang",
        distance_km: 432,
        is_active: true,
        stops: ["Hồ Chí Minh", "Phan Thiết", "Nha Trang"],
      },
      {
        start: "Đà Nẵng",
        end: "Huế",
        distance_km: 100,
        is_active: true,
        stops: ["Đà Nẵng", "Huế"],
      },
      {
        start: "Cần Thơ",
        end: "Cà Mau",
        distance_km: 179,
        is_active: true,
        stops: ["Cần Thơ", "Cà Mau"],
      },
      // Routes INACTIVE để test update
      {
        start: "Hà Nội",
        end: "Nam Định",
        distance_km: 90,
        is_active: false,
        stops: ["Hà Nội", "Nam Định"],
      },
      {
        start: "Hà Nội",
        end: "Vinh",
        distance_km: 300,
        is_active: false,
        stops: ["Hà Nội", "Ninh Bình", "Thanh Hóa", "Vinh"],
      },
    ];

    // Locations data cho mỗi stop
    const locationsData = {
      "Hà Nội": [
        {
          name: "Bến xe Mỹ Đình",
          address: "20 Phạm Hùng, Nam Từ Liêm, Hà Nội",
          latitude: 21.0285,
          longitude: 105.7823,
          type: "BOTH",
        },
        {
          name: "Bến xe Giáp Bát",
          address: "Giải Phóng, Hoàng Mai, Hà Nội",
          latitude: 20.9818,
          longitude: 105.8413,
          type: "BOTH",
        },
        {
          name: "Bến xe Gia Lâm",
          address: "Ngô Gia Khảm, Long Biên, Hà Nội",
          latitude: 21.0435,
          longitude: 105.8882,
          type: "BOTH",
        },
        {
          name: "Bến xe Nước Ngầm",
          address: "Ngọc Hồi, Hoàng Mai, Hà Nội",
          latitude: 20.9585,
          longitude: 105.8458,
          type: "PICKUP",
        },
      ],
      "Hải Phòng": [
        {
          name: "Bến xe Niệm Nghĩa",
          address: "Trần Nguyên Hãn, Lê Chân, Hải Phòng",
          latitude: 20.8449,
          longitude: 106.6881,
          type: "BOTH",
        },
        {
          name: "Bến xe Lạc Long",
          address: "Quốc lộ 5, An Dương, Hải Phòng",
          latitude: 20.8756,
          longitude: 106.6234,
          type: "DROPOFF",
        },
      ],
      "Hải Dương": [
        {
          name: "Bến xe Hải Dương",
          address: "Trần Hưng Đạo, TP Hải Dương",
          latitude: 20.9373,
          longitude: 106.3146,
          type: "BOTH",
        },
      ],
      "Ninh Bình": [
        {
          name: "Bến xe Ninh Bình",
          address: "Trần Hưng Đạo, TP Ninh Bình",
          latitude: 20.2506,
          longitude: 105.9745,
          type: "BOTH",
        },
        {
          name: "Bến xe phía Nam",
          address: "QL1A, TP Ninh Bình",
          latitude: 20.2234,
          longitude: 105.9567,
          type: "PICKUP",
        },
      ],
      "Nam Định": [
        {
          name: "Bến xe Nam Định",
          address: "Trần Hưng Đạo, TP Nam Định",
          latitude: 20.4388,
          longitude: 106.1621,
          type: "BOTH",
        },
      ],
      "Thanh Hóa": [
        {
          name: "Bến xe Thanh Hóa",
          address: "Đại lộ Lê Lợi, TP Thanh Hóa",
          latitude: 19.8067,
          longitude: 105.7852,
          type: "BOTH",
        },
        {
          name: "Bến xe phía Tây",
          address: "QL45, TP Thanh Hóa",
          latitude: 19.7945,
          longitude: 105.7234,
          type: "PICKUP",
        },
      ],
      Vinh: [
        {
          name: "Bến xe Vinh",
          address: "Lê Lợi, TP Vinh, Nghệ An",
          latitude: 18.6796,
          longitude: 105.6813,
          type: "BOTH",
        },
        {
          name: "Bến xe Chợ Vinh",
          address: "Quang Trung, TP Vinh",
          latitude: 18.6723,
          longitude: 105.6945,
          type: "DROPOFF",
        },
      ],
      "Hà Tĩnh": [
        {
          name: "Bến xe Hà Tĩnh",
          address: "TP Hà Tĩnh",
          latitude: 18.3559,
          longitude: 105.8877,
          type: "BOTH",
        },
      ],
      "Đồng Hới": [
        {
          name: "Bến xe Đồng Hới",
          address: "TP Đồng Hới, Quảng Bình",
          latitude: 17.4694,
          longitude: 106.5991,
          type: "BOTH",
        },
      ],
      Huế: [
        {
          name: "Bến xe Phía Bắc",
          address: "Đường An Dương Vương, Huế",
          latitude: 16.4789,
          longitude: 107.5823,
          type: "BOTH",
        },
        {
          name: "Bến xe Phía Nam",
          address: "97 An Dương Vương, Huế",
          latitude: 16.4456,
          longitude: 107.5934,
          type: "BOTH",
        },
      ],
      "Đà Nẵng": [
        {
          name: "Bến xe Đà Nẵng",
          address: "201 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng",
          latitude: 16.0678,
          longitude: 108.1534,
          type: "BOTH",
        },
        {
          name: "Bến xe Trung tâm",
          address: "Điện Biên Phủ, Thanh Khê, Đà Nẵng",
          latitude: 16.0544,
          longitude: 108.2022,
          type: "BOTH",
        },
        {
          name: "Ngã 3 Hòa Cầm",
          address: "Hòa Cầm, Cẩm Lệ, Đà Nẵng",
          latitude: 16.0123,
          longitude: 108.1856,
          type: "DROPOFF",
        },
      ],
      "Quảng Ngãi": [
        {
          name: "Bến xe Quảng Ngãi",
          address: "Quang Trung, TP Quảng Ngãi",
          latitude: 15.1214,
          longitude: 108.8044,
          type: "BOTH",
        },
      ],
      "Quy Nhơn": [
        {
          name: "Bến xe Quy Nhơn",
          address: "Tây Sơn, TP Quy Nhơn, Bình Định",
          latitude: 13.7829,
          longitude: 109.2196,
          type: "BOTH",
        },
      ],
      "Nha Trang": [
        {
          name: "Bến xe phía Nam Nha Trang",
          address: "23/10, Nha Trang, Khánh Hòa",
          latitude: 12.2156,
          longitude: 109.1823,
          type: "BOTH",
        },
        {
          name: "Bến xe phía Bắc",
          address: "QL1A, Nha Trang",
          latitude: 12.2678,
          longitude: 109.2034,
          type: "PICKUP",
        },
      ],
      "Phan Thiết": [
        {
          name: "Bến xe Phan Thiết",
          address: "TP Phan Thiết, Bình Thuận",
          latitude: 10.9804,
          longitude: 108.2615,
          type: "BOTH",
        },
      ],
      "Hồ Chí Minh": [
        {
          name: "Bến xe Miền Đông",
          address: "292 Đinh Bộ Lĩnh, Bình Thạnh, HCM",
          latitude: 10.8156,
          longitude: 106.7112,
          type: "BOTH",
        },
        {
          name: "Bến xe Miền Đông mới",
          address: "Xa lộ Hà Nội, TP Thủ Đức, HCM",
          latitude: 10.8789,
          longitude: 106.7845,
          type: "BOTH",
        },
        {
          name: "Bến xe Miền Tây",
          address: "395 Kinh Dương Vương, Bình Tân, HCM",
          latitude: 10.7523,
          longitude: 106.6178,
          type: "BOTH",
        },
        {
          name: "Bến xe An Sương",
          address: "Quốc lộ 22, Hóc Môn, HCM",
          latitude: 10.8623,
          longitude: 106.6023,
          type: "PICKUP",
        },
      ],
      "Vũng Tàu": [
        {
          name: "Bến xe Vũng Tàu",
          address: "192 Nam Kỳ Khởi Nghĩa, Vũng Tàu",
          latitude: 10.4114,
          longitude: 107.1362,
          type: "BOTH",
        },
      ],
      "Biên Hòa": [
        {
          name: "Bến xe Biên Hòa",
          address: "TP Biên Hòa, Đồng Nai",
          latitude: 10.9574,
          longitude: 106.8426,
          type: "BOTH",
        },
      ],
      "Long An": [
        {
          name: "Ngã 3 Tân An",
          address: "QL1A, Tân An, Long An",
          latitude: 10.5355,
          longitude: 106.4132,
          type: "BOTH",
        },
      ],
      "Cần Thơ": [
        {
          name: "Bến xe Cần Thơ",
          address: "Nguyễn Trãi, Ninh Kiều, Cần Thơ",
          latitude: 10.0452,
          longitude: 105.7469,
          type: "BOTH",
        },
        {
          name: "Bến xe 91B",
          address: "Quốc lộ 91B, Cần Thơ",
          latitude: 10.0234,
          longitude: 105.7234,
          type: "DROPOFF",
        },
      ],
      "Vĩnh Long": [
        {
          name: "Bến xe Vĩnh Long",
          address: "TP Vĩnh Long",
          latitude: 10.2397,
          longitude: 105.972,
          type: "BOTH",
        },
      ],
      "Cà Mau": [
        {
          name: "Bến xe Cà Mau",
          address: "TP Cà Mau",
          latitude: 9.1769,
          longitude: 105.15,
          type: "BOTH",
        },
      ],
      "Đà Lạt": [
        {
          name: "Bến xe Đà Lạt",
          address: "01 Tô Hiến Thành, Đà Lạt, Lâm Đồng",
          latitude: 11.9404,
          longitude: 108.4583,
          type: "BOTH",
        },
      ],
      "Buôn Ma Thuột": [
        {
          name: "Bến xe Buôn Ma Thuột",
          address: "TP Buôn Ma Thuột, Đắk Lắk",
          latitude: 12.6674,
          longitude: 108.0378,
          type: "BOTH",
        },
      ],
    };

    for (const routeData of routesData) {
      // Tạo hoặc cập nhật route
      const route = await Route.findOneAndUpdate(
        {
          start_id: createdStops[routeData.start]._id,
          stop_id: createdStops[routeData.end]._id,
        },
        {
          start_id: createdStops[routeData.start]._id,
          stop_id: createdStops[routeData.end]._id,
          distance_km: routeData.distance_km,
          is_active: routeData.is_active,
        },
        { upsert: true, new: true }
      );

      const statusIcon = routeData.is_active ? "✅" : "⚠️";
      console.log(
        `   ${statusIcon} ${routeData.start} - ${routeData.end} (${
          routeData.distance_km
        }km) ${!routeData.is_active ? "[INACTIVE]" : ""}`
      );

      // Xóa route stops cũ và locations liên quan
      const oldRouteStops = await RouteStop.find({ route_id: route._id });
      const oldRouteStopIds = oldRouteStops.map((rs) => rs._id);
      await StopLocation.deleteMany({
        route_stop_id: { $in: oldRouteStopIds },
      });
      await RouteStop.deleteMany({ route_id: route._id });

      // Tạo route stops mới
      for (let i = 0; i < routeData.stops.length; i++) {
        const stopName = routeData.stops[i];
        const stop = createdStops[stopName];

        const routeStop = await RouteStop.create({
          route_id: route._id,
          stop_id: stop._id,
          stop_order: i + 1,
          is_pickup: true,
        });

        // Tạo locations cho route stop
        const locations = locationsData[stopName] || [];
        for (const loc of locations) {
          await StopLocation.create({
            route_stop_id: routeStop._id,
            location_name: loc.name,
            address: loc.address,
            latitude: loc.latitude || null,
            longitude: loc.longitude || null,
            location_type: loc.type,
            is_active: true,
          });
        }
      }
    }

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(70));
    console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));

    console.log("\n📋 TEST ACCOUNTS (Password: 123456)");
    console.log("┌─────────────────────┬──────────────┬─────────────────┐");
    console.log("│ Name                │ Phone        │ Role            │");
    console.log("├─────────────────────┼──────────────┼─────────────────┤");
    console.log("│ Admin System        │ 0900000001   │ admin           │");
    console.log("│ Admin Manager       │ 0900000002   │ admin           │");
    console.log("│ Nguyen Van A        │ 0911111111   │ customer        │");
    console.log("│ Tran Thi B          │ 0911111112   │ customer        │");
    console.log("│ Le Van C            │ 0911111113   │ customer (!)    │");
    console.log("│ Tai Xe Minh         │ 0922222221   │ driver          │");
    console.log("│ Tai Xe Hung         │ 0922222222   │ driver          │");
    console.log("│ Le Nhan Vien A      │ 0933333331   │ receptionist    │");
    console.log("│ Phu Xe Anh          │ 0944444441   │ assistant_driver│");
    console.log("└─────────────────────┴──────────────┴─────────────────┘");
    console.log("  (!) = chưa verify");

    console.log("\n🛣️ ROUTES CREATED");
    console.log(
      "┌───────────────────────────────────┬──────────┬────────┬──────────┐"
    );
    console.log(
      "│ Route                             │ Distance │ Stops  │ Status   │"
    );
    console.log(
      "├───────────────────────────────────┼──────────┼────────┼──────────┤"
    );
    for (const r of routesData) {
      const name = `${r.start} - ${r.end}`.padEnd(33);
      const dist = `${r.distance_km} km`.padStart(8);
      const stops = `${r.stops.length}`.padStart(6);
      const status = r.is_active ? "ACTIVE  " : "INACTIVE";
      console.log(`│ ${name} │ ${dist} │ ${stops} │ ${status} │`);
    }
    console.log(
      "└───────────────────────────────────┴──────────┴────────┴──────────┘"
    );

    console.log("\n🚌 BUS TYPES & BUSES");
    console.log("┌─────────────────────────┬──────────────┬─────────────┐");
    console.log("│ Bus Type                │ License      │ Status      │");
    console.log("├─────────────────────────┼──────────────┼─────────────┤");
    for (const bus of buses) {
      const type =
        busTypes
          .find(
            (bt) =>
              bt.category ===
              Object.keys(createdBusTypes).find(
                (k) =>
                  createdBusTypes[k]._id.toString() ===
                  bus.bus_type_id.toString()
              )
          )
          ?.name.substring(0, 23)
          .padEnd(23) || "Unknown".padEnd(23);
      console.log(
        `│ ${type} │ ${bus.license_plate.padEnd(12)} │ ${bus.status.padEnd(
          11
        )} │`
      );
    }
    console.log("└─────────────────────────┴──────────────┴─────────────┘");

    console.log("\n📍 ADMIN API ENDPOINTS - UPDATE BUS ROUTE");
    console.log(
      "┌────────────────────────────────────────────────────────────────────┐"
    );
    console.log(
      "│ METHOD │ ENDPOINT                                    │ DESCRIPTION │"
    );
    console.log(
      "├────────────────────────────────────────────────────────────────────┤"
    );
    console.log(
      "│ GET    │ /api/admin/check/routes                     │ List routes │"
    );
    console.log(
      "│ GET    │ /api/admin/check/routes/:id                 │ Get detail  │"
    );
    console.log(
      "│ PUT    │ /api/admin/check/routes/:id                 │ Update route│"
    );
    console.log(
      "│ PATCH  │ /api/admin/check/routes/:id/status          │ Toggle stat │"
    );
    console.log(
      "│ PUT    │ /api/admin/check/routes/:rId/stops/:sId/order│ Reorder    │"
    );
    console.log(
      "│ PATCH  │ /api/admin/check/routes/:rId/stops/:sId/pickup│ Pickup    │"
    );
    console.log(
      "│ PUT    │ /api/admin/check/locations/:id              │ Update loc  │"
    );
    console.log(
      "│ PATCH  │ /api/admin/check/locations/:id/status       │ Toggle loc  │"
    );
    console.log(
      "└────────────────────────────────────────────────────────────────────┘"
    );

    console.log("\n📍 PUBLIC API ENDPOINTS");
    console.log(
      "┌────────────────────────────────────────────────────────────────────┐"
    );
    console.log(
      "│ GET /api/customer/notcheck/routes         - List active routes     │"
    );
    console.log(
      "│ GET /api/customer/notcheck/routes/:id     - Get route detail       │"
    );
    console.log(
      "│ GET /api/customer/notcheck/routes/search  - Search routes          │"
    );
    console.log(
      "│ GET /api/customer/notcheck/stops          - List all stops         │"
    );
    console.log(
      "└────────────────────────────────────────────────────────────────────┘"
    );

    console.log("\n📝 SAMPLE API CALLS:");
    console.log(
      "┌────────────────────────────────────────────────────────────────────┐"
    );
    console.log(
      "│ # Lấy danh sách routes (admin có thể thấy cả inactive)             │"
    );
    console.log(
      "│ GET /api/admin/check/routes?is_active=false&page=1&limit=10        │"
    );
    console.log(
      "│                                                                    │"
    );
    console.log(
      "│ # Cập nhật route                                                   │"
    );
    console.log(
      "│ PUT /api/admin/check/routes/:id                                    │"
    );
    console.log(
      '│ Body: { "distance_km": 800, "is_active": true }                    │'
    );
    console.log(
      "│                                                                    │"
    );
    console.log(
      "│ # Bật/tắt route                                                    │"
    );
    console.log(
      "│ PATCH /api/admin/check/routes/:id/status                           │"
    );
    console.log(
      '│ Body: { "is_active": true }                                        │'
    );
    console.log(
      "│                                                                    │"
    );
    console.log(
      "│ # Đổi thứ tự stop                                                  │"
    );
    console.log(
      "│ PUT /api/admin/check/routes/:routeId/stops/:stopId/order           │"
    );
    console.log(
      '│ Body: { "new_order": 3 }                                           │'
    );
    console.log(
      "│                                                                    │"
    );
    console.log(
      "│ # Bật/tắt pickup cho stop                                          │"
    );
    console.log(
      "│ PATCH /api/admin/check/routes/:routeId/stops/:stopId/pickup        │"
    );
    console.log(
      '│ Body: { "is_pickup": false }                                       │'
    );
    console.log(
      "│                                                                    │"
    );
    console.log(
      "│ # Cập nhật location                                                │"
    );
    console.log(
      "│ PUT /api/admin/check/locations/:id                                 │"
    );
    console.log(
      '│ Body: { "name": "Bến xe mới", "type": "PICKUP" }                   │'
    );
    console.log(
      "└────────────────────────────────────────────────────────────────────┘"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seed();
