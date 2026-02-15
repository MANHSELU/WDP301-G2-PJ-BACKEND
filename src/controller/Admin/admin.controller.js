const { default: mongoose } = require("mongoose");
const Bus = require("../../model/Bus");
const BusType = require("../../model/BusType");
const Route = require("../../model/Routers");
const Route_Stop = require("../../model/route_stops");
const Stops = require("../../model/Stops");

// Hàm lấy tất cả cái loại xe bustype ra
module.exports.getAllBusType = async (req, res) => {
  try {
    const busType = await BusType.find().select("name");
    return res.status(200).json(busType);
  } catch (error) {
    return res.status(404).json({ message: "Không tìm thấy loại xe" });
  }
};
// Hàm tạo xe
module.exports.createBus = async (req, res) => {
  try {
    const { license_plate, bus_type_id, seat_layout } = req.body;
    if (!license_plate || !bus_type_id || !seat_layout) {
      return res.status(404).json({ message: "Các trường là bắt buộc" });
    }
    const bus = await Bus.findOne({ license_plate });
    if (bus) {
      return res.status(409).json({ message: "Biến số xe là bắt buộc" });
    }
    const newBus = await Bus.create({
      license_plate,
      bus_type_id,
      seat_layout,
    });
    await newBus.save();
    return res.status(201).json({ message: "Tạo xe thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// Hàm lấy tất cả các điểm stop 
module.exports.searchStops = async (req,res) =>{
  try {
      const {keyword} = req.query;
      const searchStops = await Stops.find({name : {$regex: keyword,$options: "i"}});
      return res.status(200).json(searchStops);
  } catch (error) {
      return res.status(500).json({ message: error.message });
  }
}
// Hàm lấy ra những stop ở giữa điểm bắt đầu và kết thúc và sort theo order
module.exports.getSuggestStops = async (req, res) => {
  try {
    const { start_id, stop_id } = req.query;
    const start = await Stops.findById(start_id);
    const end = await Stops.findById(stop_id);
    if (!start || !end) {
      return res.status(404).json({ message: "Không tìm thấy điểm" });
    }
    const startLocation = start.location.coordinates;
    const [lng1, lat1] = start.location.coordinates;
    const [lng2, lat2] = end.location.coordinates;
    const minLat = Math.min(lat1, lat2);
    const maxLat = Math.max(lat1, lat2);
    const minLng = Math.min(lng1, lng2);
    const maxLng = Math.max(lng1, lng2);
    // Tính khoảng cách từ start -> end
    const [endDistanceResult] = await Stops.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: startLocation,
          },
          distanceField: "distance",
          spherical: true,
          query: { _id: end._id }, // chỉ tính cho end
        },
      },
    ]);
      const endDistance = endDistanceResult.distance;
    const stops = await Stops.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: startLocation
      },
      distanceField: "distance",
      spherical: true,
      query: {
        "location.coordinates.1": { $gte: minLat, $lte: maxLat },
        "location.coordinates.0": { $gte: minLng, $lte: maxLng },
        _id: { $nin: [start._id, end._id] }
      }
    }
  },
  {
    $match: {
      distance: { $lte: endDistance }
    }
  },
  {
    $project: {
      name: 1,
      province: 1,
      distance: 1
    }
  }
]);
       return res.status(200).json({start,recommendedStops: stops,end});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message});
  }
};

// Hàm tạo tuyến đường (bao gồm các các stop node và các điểm con)
// Cơ chế transaction ==> Hoặc là làm TẤT CẢ, hoặc là KHÔNG làm gì cả.
// Sử dụng transaction cho trường hợp khi sai thứ tự stop_order để tránh trường hợp stop_order sai mà nó vẫn thêm vào tuyến mới (Route)
module.exports.createRoutes = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { start_id, stop_id, stops } = req.body;
    if (!start_id || !stop_id || !stops) {
      return res.status(404).json({ message: "Các trường nhập là bắt buộc" });
    }
    const newRoute = await Route.create(
      {
        start_id,
        stop_id,
      },
    );
    await newRoute.save(session);
    const newRoute_Stop = stops.map((s) => ({
      route_id: newRoute._id,
      stop_id: s.stop_id,
      stop_order: s.stop_order,
    }));
    await Route_Stop.insertMany(newRoute_Stop, { session });
    await session.commitTransaction();
    return res.status(201).json({ message: "Tạo tuyến thành công" });
  } catch (error) {
    await session.abortTransaction(); // rollback khi lỗi, hủy toàn bộ transaction, trả về lại trạng thái lúc đầu.
    if (error.code === 110000) {
      return res
        .status(400)
        .json({ message: "Thứ tự các điểm bị trùng trong cùng 1 tuyến" });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
