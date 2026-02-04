// đây chính là các node thuộc 1 tuyến đường cụ thê
const mongoose = require("mongoose");

const RouteStopSchema = new mongoose.Schema(
    {
        route_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
            required: true,
        },
        // điểm node
        stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },
        // thứ tự các node 1, 2 1-2 , 1-3
        stop_order: {
            type: Number,
            required: true, // thứ tự dừng
            min: 1,
        },
        // // 
        // estimated_time: {
        //     type: String,
        //     required: false, // VD: "08:30"
        // },
        // quảng nghãi  dn-hcm : ngày bth : bắt khách qn  , tết : qn : kh khách nữa
        // đi update trạng thái của 1 điểm có được bắt khách hay không
        is_pickup: {
            type: Boolean,
            default: true, // có cho lên xe không
        },
    },
    {
        timestamps: false,
    }
);

// 1 tuyến không được trùng thứ tự dừng
RouteStopSchema.index({ route_id: 1, stop_order: 1 }, { unique: true });

module.exports = mongoose.model("RouteStop", RouteStopSchema);

