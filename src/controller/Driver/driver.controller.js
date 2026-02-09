const trip = require("./../../model/Trip")
const bus = require("./../../model/Bus")
const router = require("./../../model/Routers")
const stop = require("./../../model/Stops")
const bustype = require("./../../model/BusType")
module.exports.faceLogin = async (req, res) => {
    try {
        console.log("chạy vào login face")
        const { image } = req.body;
        const userId = res.locals.user.id
        // 1️⃣ Validate
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu ảnh"
            });
        }
        // 2️⃣ Gửi sang Python AI
        const pythonRes = await fetch(
            "http://localhost:8001/face-login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    image: image,
                })
            }
        );
        console.log("gọi python")
        if (!pythonRes.ok) {
            throw new Error("Python server lỗi");
        }

        const result = await pythonRes.json();
        console.log("result là : ", result)
        if (!result.success) {
            return res.status(401).json({
                success: false,
                message: "Xác thực thất bại"
            });
        }

        // 4️⃣ TODO: Tạo JWT / session nếu cần
        // const token = jwt.sign({ userId: result.user_id }, process.env.JWT_SECRET)

        return res.json({
            success: true,
            similarity: result.similarity,
            user_id: result.user_id
            // token
        });

    } catch (err) {
        console.log("❌ Lỗi faceLogin:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};
module.exports.registerCamera = async (req, res) => {
    try {
        const { image } = req.body;
        // 1️⃣ Validate input
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Missing userId or image",
            });
        }
        const userId = res.locals.user.id
        // 3️⃣ Call Python Face Register API
        const response = await fetch("http://localhost:8001/face-register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId,
                image: image,
            }),
        });
        // 4️⃣ Python trả lỗi
        const data = await response.json();

        // ❌ nếu Python báo lỗi
        if (!data.success) {
            return res.status(400).json({
                success: false,
                message: data.error || data.message || "Face register failed",
            });
        }

        // 5️⃣ Thành công
        return res.status(200).json({
            success: true,
            message: "Face registered successfully",
        });

    } catch (error) {
        console.error("registerCamera error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
module.exports.trips = async (req, res) => {
    try {
        const userId = res.locals.user.id
        console.log("usersId là : ", userId)
        const trips = await trip.find({
            $or: [{
                "drivers.driver_id": userId
            }
            ]
        })
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({
                path: "bus_id",
                populate: {
                    path: "bus_type_id"
                }
            }
            )
            .populate({
                path: "route_id",
                populate: [
                    {
                        path: "start_id"
                    },
                    {
                        path: "stop_id"
                    }
                ]
            })
            .populate("assistant_id", "-face_embedding -password -role")
        res.status(200).json({
            message: "successfully",
            data: trips
        })
    } catch (err) {
        console.log("lỗi trong chương trình là : ", err)
        res.status(500).json({
            message: "Server error",
        })
    }
}
module.exports.updateStrip = async (req, res) => {
    try {
        const { id } = req.body;

        const updatedTrip = await trip.findByIdAndUpdate(
            id,
            { status: "RUNNING" },
            { new: true }
        ) // trả về bản ghi sau khi update như kiểu là console.log ra thì trả về mới 
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({
                path: "bus_id",
                populate: {
                    path: "bus_type_id"
                }
            }
            )
            .populate({
                path: "route_id",
                populate: [
                    {
                        path: "start_id"
                    },
                    {
                        path: "stop_id"
                    }
                ]
            })
            .populate("assistant_id", "-face_embedding -password -role")

        if (!updatedTrip) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }

        return res.status(200).json({
            message: "Update status successfully",
            data: updatedTrip
        });

    } catch (err) {
        console.log("Lỗi:", err);
        return res.status(500).json({
            message: "Server error"
        });
    }
}