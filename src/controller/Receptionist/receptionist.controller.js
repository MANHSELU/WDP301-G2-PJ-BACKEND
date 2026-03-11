const Parcel = require("../../model/Parcel");
const Trip = require("../../model/Trip");

const PARCEL_STATUS = {
  RECEIVED: "RECEIVED",
  ON_BUS: "ON_BUS",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

async function calculateUsedWeight(trip_id) {
  const parcels = await Parcel.find({
    trip_id,
    approval_status: APPROVAL_STATUS.APPROVED,
    status: { $nin: [PARCEL_STATUS.CANCELLED, PARCEL_STATUS.DELIVERED] },
  }).select("weight_kg");

  return parcels.reduce((sum, p) => sum + (p.weight_kg || 0), 0);
}

module.exports.listParcels = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status.toUpperCase();
    if (req.query.approval_status) filter.approval_status = req.query.approval_status.toUpperCase();
    if (req.query.trip_id) filter.trip_id = req.query.trip_id;
    if (req.query.receiver_phone) filter.receiver_phone = req.query.receiver_phone;

    const total = await Parcel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const parcels = await Parcel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status route_id max_weight_kg",
        populate: {
          path: "route_id",
          select: "start_id stop_id",
          populate: [
            { path: "start_id", select: "name province" },
            { path: "stop_id", select: "name province" },
          ],
        },
      })
      .populate({ path: "sender_id", select: "name phone" })
      .populate({ path: "start_id", select: "stop_id stop_order" })
      .populate({ path: "end_id", select: "stop_id stop_order" })
      .populate({
        path: "pickup_location_id",
        select: "location_name address latitude longitude",
      })
      .populate({
        path: "dropoff_location_id",
        select: "location_name address latitude longitude",
      })
      .lean();

    return res.status(200).json({
      message: "Lấy danh sách đơn gửi hàng thành công",
      data: parcels,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("[listParcels] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

module.exports.getParcelDetail = async (req, res) => {
  try {
    const parcelId = req.params.id;
    const parcel = await Parcel.findById(parcelId)
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status route_id max_weight_kg",
        populate: {
          path: "route_id",
          select: "start_id stop_id",
          populate: [
            { path: "start_id", select: "name province" },
            { path: "stop_id", select: "name province" },
          ],
        },
      })
      .populate({ path: "sender_id", select: "name phone" })
      .populate({ path: "start_id", select: "stop_id stop_order" })
      .populate({ path: "end_id", select: "stop_id stop_order" })
      .populate({
        path: "pickup_location_id",
        select: "location_name address latitude longitude",
      })
      .populate({
        path: "dropoff_location_id",
        select: "location_name address latitude longitude",
      })
      .lean();

    if (!parcel) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    return res.status(200).json({ message: "OK", data: parcel });
  } catch (err) {
    console.error("[getParcelDetail] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};


