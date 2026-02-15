// Model Stop moi'
// đây là bảng để lưu toàn bộ tỉnh thành mình đi kéo api về (node)
const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, //Bến xe Đà Nẵng, Bến xe Mỹ Đình...
      trim: true,
    },
    province: {
      type: String,
      required: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat] (lng đứng trước)
        required: true,
      },
    },

    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);
StopSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Stop", StopSchema);
