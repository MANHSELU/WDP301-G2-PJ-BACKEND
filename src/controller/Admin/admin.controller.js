const Bus = require("../../model/Bus");

// Hàm tạo xe
module.exports.createBus = async (req, res) => {
  try {
    const { license_plate, bus_type_id, seat_layout } = req.body;
    if (!license_plate || !bus_type_id || !seat_layout) {
      return res.status(404).json({ message: "Fields are required" });
    }
    const bus = await Bus.findOne({ license_plate });
    if (bus) {
      return res.status(409).json({ message: "License plate is exist" });
    }
    const newBus = await Bus.create({
      license_plate,
      bus_type_id,
      seat_layout,
    });
    await newBus.save();
    return res.status(201).json({ message: "Bus created successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
