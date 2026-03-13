const axios = require("axios");
const Stop = require("../../model/Stops");
const Route = require("../../model/Routers");
const Trip = require("../../model/Trip");
const RouteStop = require("../../model/route_stops");
const RouteSegmentPrices = require("../../model/RouteSegmentPrice");
const BookingOrder = require("../../model/BookingOrder");
const BookingPayment = require("../../model/BookingPayment");
const Bus = require("../../model/Bus");
const mongoose = require("mongoose");

const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "gpt-oss:20b-cloud";

// ===================== HELPERS =====================

function normalizeDate(text) {
  const today = new Date();
  if (!text || text === "") return today.toISOString().split("T")[0];

  const t = text.toLowerCase().trim();
  if (t.includes("hôm nay")) return today.toISOString().split("T")[0];
  if (t.includes("ngày mai") || t === "mai") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  }
   if (t.includes("ngày hôm sau")) {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  }
  if (t.includes("ngày kia") || t.includes("ngày mốt")) {
    today.setDate(today.getDate() + 2);
    return today.toISOString().split("T")[0];
  }

  // thử parse trực tiếp (dd/mm/yyyy hoặc yyyy-mm-dd)
  const ddmm = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
  if (ddmm) {
    const day = ddmm[1].padStart(2, "0");
    const month = ddmm[2].padStart(2, "0");
    const year = ddmm[3] || today.getFullYear();
    return `${year}-${month}-${day}`;
  }

  // fallback: nếu không parse được thì trả về hôm nay
  const tryDate = new Date(text);
  if (isNaN(tryDate.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return text;
}

function formatCurrency(num) {
  return Number(num).toLocaleString("vi-VN") + "đ";
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
}

// Gọi Ollama để parse intent từ tin nhắn user
async function parseIntent(message, conversationHistory, context) {
  const systemPrompt = `
Bạn là trợ lý đặt vé xe khách. Phân tích tin nhắn của khách hàng và trả về JSON.

CONTEXT hiện tại: ${JSON.stringify(context || {})}

Các intent hợp lệ:
- search_trip: Khách muốn tìm chuyến xe (cần from, to, date)
- select_route: Khách chọn tuyến từ kết quả tìm kiếm (cần route_index: số thứ tự 1,2,3...)
- select_trip: Khách chọn chuyến xe cụ thể (cần trip_index: số thứ tự 1,2,3...)
- select_seat: Khách chọn ghế (cần seats: ["A1","A2"...])
- confirm_booking: Khách xác nhận đặt vé (cần passenger_name, passenger_phone)
- cancel: Khách muốn hủy/bắt đầu lại
- greeting: Khách chào hỏi
- unknown: Không hiểu

Trả về JSON duy nhất, KHÔNG có text khác:
{
  "intent": "...",
  "from": "",
  "to": "",
  "date": "",
  "route_index": 0,
  "trip_index": 0,
  "seats": [],
  "passenger_name": "",
  "passenger_phone": ""
}

Ví dụ:
- "tôi muốn đi Đà Nẵng ra Huế ngày mai" → {"intent":"search_trip","from":"Đà Nẵng","to":"Huế","date":"ngày mai"}
- "chọn tuyến 1" hoặc "tuyến đầu tiên" → {"intent":"select_route","route_index":1}
- "chọn chuyến 2" hoặc "chuyến thứ 2" → {"intent":"select_trip","trip_index":2}
- "ghế A1 A2" hoặc "tôi chọn A1, A2" → {"intent":"select_seat","seats":["A1","A2"]}
- "đặt vé, tên Nguyễn Văn A, sdt 0901234567" → {"intent":"confirm_booking","passenger_name":"Nguyễn Văn A","passenger_phone":"0901234567"}
- "hủy" hoặc "bắt đầu lại" → {"intent":"cancel"}
- "xin chào" → {"intent":"greeting"}
`;

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Thêm lịch sử hội thoại gần nhất (tối đa 6 tin)
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: message });

  const response = await axios.post(OLLAMA_URL, {
    model: OLLAMA_MODEL,
    stream: false,
    messages,
  });

  const aiText = response.data.message.content;
  // Tìm JSON trong response
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

  return JSON.parse(jsonMatch[0]);
}

// ===================== INTENT HANDLERS =====================

async function handleGreeting() {
  return {
    reply: "Xin chào! Tôi là trợ lý đặt vé xe khách. Bạn muốn đi đâu? Hãy cho tôi biết điểm đi, điểm đến và ngày đi nhé!",
    context: {},
  };
}

async function handleSearchTrip(parsed, context) {
  const date = normalizeDate(parsed.date);

  const fromStop = await Stop.findOne({
    province: { $regex: parsed.from, $options: "i" },
  });
  const toStop = await Stop.findOne({
    province: { $regex: parsed.to, $options: "i" },
  });

  if (!fromStop || !toStop) {
    return {
      reply: `Không tìm thấy ${!fromStop ? "điểm đi" : "điểm đến"}. Bạn thử nhập tên tỉnh/thành phố chính xác hơn nhé (ví dụ: Đà Nẵng, Huế, Hà Nội, TP.HCM...)`,
      context,
    };
  }

  // Tìm route qua logic trực tiếp (không gọi API nội bộ)
  const startStops = await RouteStop.find({ stop_id: fromStop._id, is_pickup: true });
  if (!startStops.length) {
    return { reply: "Không có tuyến xe nào từ " + parsed.from, context };
  }

  const validPairs = [];
  for (const startStop of startStops) {
    const endStop = await RouteStop.findOne({
      route_id: startStop.route_id,
      stop_id: toStop._id,
      stop_order: { $gt: startStop.stop_order },
    });
    if (endStop) validPairs.push({ startStop, endStop });
  }

  if (!validPairs.length) {
    return { reply: `Không có tuyến xe từ ${parsed.from} đến ${parsed.to}`, context };
  }

  const targetDateStr = new Date(date).toISOString().slice(0, 10);
  const routes = [];
  const seenRouteIds = new Set();

  for (const { startStop, endStop } of validPairs) {
    const routeIdStr = String(startStop.route_id);
    if (seenRouteIds.has(routeIdStr)) continue;

    const allStopsOfRoute = await RouteStop.find({ route_id: startStop.route_id })
      .sort({ stop_order: 1 }).lean();

    let cumulativeHoursToPickup = 0;
    for (const s of allStopsOfRoute) {
      const h = Number(s.estimated_time ?? s[" estimated_time"]) || 0;
      cumulativeHoursToPickup += h;
      if (String(s._id) === String(startStop._id)) break;
    }

    const trips = await Trip.find({
      route_id: startStop.route_id,
      status: { $ne: "CANCELLED" },
    }).lean();

    const hasMatchingTrip = trips.some((trip) => {
      const departureMs = new Date(trip.departure_time).getTime();
      const arrivalAtPickupMs = departureMs + cumulativeHoursToPickup * 3600000;
      return new Date(arrivalAtPickupMs).toISOString().slice(0, 10) === targetDateStr;
    });

    if (!hasMatchingTrip) continue;

    const route = await Route.findById(startStop.route_id)
      .populate({ path: "start_id", select: "name province" })
      .populate({ path: "stop_id", select: "name province" })
      .lean();

    if (route) {
      seenRouteIds.add(routeIdStr);
      routes.push(route);
    }
  }

  if (!routes.length) {
    return {
      reply: `Không có chuyến xe từ ${parsed.from} đến ${parsed.to} vào ngày ${date}. Bạn thử ngày khác nhé!`,
      context,
    };
  }

  // Format kết quả
  let reply = `Tìm thấy ${routes.length} tuyến xe từ ${parsed.from} đến ${parsed.to} ngày ${date}:\n\n`;
  routes.forEach((r, i) => {
    reply += `${i + 1}. ${r.start_id?.name} → ${r.stop_id?.name} (${r.distance_km || "?"} km)\n`;
  });
  reply += `\nBạn muốn xem chuyến xe của tuyến nào? (Trả lời số thứ tự, ví dụ: "chọn tuyến 1")`;

  return {
    reply,
    context: {
      step: "select_route",
      from: parsed.from,
      to: parsed.to,
      date,
      fromStopId: String(fromStop._id),
      toStopId: String(toStop._id),
      routes: routes.map((r) => ({
        _id: String(r._id),
        name: `${r.start_id?.name} → ${r.stop_id?.name}`,
        distance_km: r.distance_km,
      })),
    },
  };
}

async function handleSelectRoute(parsed, context) {
  if (!context.routes || !context.routes.length) {
    return { reply: "Bạn chưa tìm chuyến xe. Hãy cho tôi biết bạn muốn đi đâu nhé!", context: {} };
  }

  const idx = (parsed.route_index || 1) - 1;
  if (idx < 0 || idx >= context.routes.length) {
    return { reply: `Vui lòng chọn từ 1 đến ${context.routes.length}`, context };
  }

  const selectedRoute = context.routes[idx];

  // Lấy trips SCHEDULED của route này
  const trips = await Trip.find({
    route_id: selectedRoute._id,
    status: "SCHEDULED",
  })
    .populate({
      path: "bus_id",
      populate: { path: "bus_type_id" },
      select: "-seat_layout",
    })
    .sort({ departure_time: 1 })
    .lean();

  if (!trips.length) {
    return { reply: "Tuyến này hiện không có chuyến xe nào. Bạn thử tuyến khác nhé!", context };
  }

  let reply = `Tuyến ${selectedRoute.name} có ${trips.length} chuyến:\n\n`;
  trips.forEach((t, i) => {
    const busType = t.bus_id?.bus_type_id?.name || "N/A";
    const category = t.bus_id?.bus_type_id?.category || "";
    reply += `${i + 1}. Khởi hành: ${formatDateTime(t.departure_time)} | Loại xe: ${busType} (${category})\n`;
  });
  reply += `\nBạn muốn chọn chuyến nào? (Trả lời: "chọn chuyến 1")`;

  return {
    reply,
    context: {
      ...context,
      step: "select_trip",
      selectedRouteId: selectedRoute._id,
      selectedRouteName: selectedRoute.name,
      trips: trips.map((t) => ({
        _id: String(t._id),
        departure_time: t.departure_time,
        bus_id: String(t.bus_id?._id),
        bus_type_id: String(t.bus_id?.bus_type_id?._id),
        bus_type_name: t.bus_id?.bus_type_id?.name || "",
      })),
    },
  };
}

async function handleSelectTrip(parsed, context) {
  if (!context.trips || !context.trips.length) {
    return { reply: "Bạn chưa chọn tuyến. Hãy tìm chuyến xe trước nhé!", context: {} };
  }

  const idx = (parsed.trip_index || 1) - 1;
  if (idx < 0 || idx >= context.trips.length) {
    return { reply: `Vui lòng chọn từ 1 đến ${context.trips.length}`, context };
  }

  const selectedTrip = context.trips[idx];

  // Lấy ghế đã đặt
  const orders = await BookingOrder.find({
    trip_id: selectedTrip._id,
    order_status: { $ne: "CANCELLED" },
  }).select("seat_labels");
  const bookedSeats = [...new Set(orders.flatMap((o) => o.seat_labels || []))];

  // Lấy sơ đồ ghế từ bus
  const bus = await Bus.findById(selectedTrip.bus_id).lean();
  console.log("[DEBUG] bus_id:", selectedTrip.bus_id, "bus found:", !!bus, "seat_layout:", !!bus?.seat_layout);

  let seatInfo = "";
  let allSeats = [];

  if (bus && bus.seat_layout) {
    const { rows, columns, row_overrides } = bus.seat_layout;
    const floors = bus.seat_layout.floors || 1;

    for (let floor = 1; floor <= floors; floor++) {
      let seatCounter = 1;
      for (let row = 1; row <= rows; row++) {
        const override = row_overrides?.find(
          (r) => r.row_index === row && r.floor === floor
        );
        (columns || []).forEach((col) => {
          let seatsInCol = col.seats_per_row;
          if (override) {
            const colOverride = override.column_overrides?.find(
              (c) => c.column_name === col.name
            );
            if (colOverride) seatsInCol = colOverride.seats;
          }
          for (let i = 0; i < seatsInCol; i++) {
            allSeats.push(`A${seatCounter++}`);
          }
        });
      }
    }
  }


  const availableSeats = allSeats.filter((s) => !bookedSeats.includes(s));

  // Lấy giá vé
  const startRouteStop = await RouteStop.findOne({
    route_id: context.selectedRouteId,
    stop_id: context.fromStopId,
  });
  const endRouteStop = await RouteStop.findOne({
    route_id: context.selectedRouteId,
    stop_id: context.toStopId,
  });

  let price = 0;
  if (startRouteStop && endRouteStop) {
    const priceDoc = await RouteSegmentPrices.findOne({
      route_id: context.selectedRouteId,
      start_id: startRouteStop._id,  
      end_id: endRouteStop._id,
      bus_type_id: selectedTrip.bus_type_id,
    });
    if (priceDoc) price = priceDoc.base_price;
  }

  let reply = `Chuyến xe: ${context.selectedRouteName}\n`;
  reply += `Khởi hành: ${formatDateTime(selectedTrip.departure_time)}\n`;
  reply += `Loại xe: ${selectedTrip.bus_type_name}\n`;
  if (price) reply += `Giá vé: ${formatCurrency(price)}/ghế\n`;
  reply += `\nGhế đã đặt (${bookedSeats.length}): ${bookedSeats.length ? bookedSeats.join(", ") : "Chưa có"}\n`;
  reply += `Ghế còn trống (${availableSeats.length}): ${availableSeats.join(", ")}\n`;
  reply += `\nBạn muốn chọn ghế nào? (Ví dụ: "ghế A1, A2")`;

  return {
    reply,
    context: {
      ...context,
      step: "select_seat",
      selectedTripId: selectedTrip._id,
      selectedTripDeparture: selectedTrip.departure_time,
      busTypeId: selectedTrip.bus_type_id,
      bookedSeats,
      availableSeats,
      ticketPrice: price,
      startRouteStopId: startRouteStop ? String(startRouteStop._id) : null,
      endRouteStopId: endRouteStop ? String(endRouteStop._id) : null,
    },
  };
}

async function handleSelectSeat(parsed, context) {
  if (!context.availableSeats || context.step !== "select_seat") {
    return { reply: "Bạn chưa chọn chuyến xe. Hãy tìm chuyến trước nhé!", context: {} };
  }

  const seats = parsed.seats || [];
  if (!seats.length) {
    return { reply: "Bạn chưa cho tôi biết muốn chọn ghế nào. Ví dụ: \"ghế A1, A2\"", context };
  }

  // Validate ghế
  const upperSeats = seats.map((s) => s.toUpperCase().trim());
  const invalidSeats = upperSeats.filter((s) => !context.availableSeats.includes(s));
  if (invalidSeats.length) {
    const alreadyBooked = invalidSeats.filter((s) => context.bookedSeats.includes(s));
    const notExist = invalidSeats.filter((s) => !context.bookedSeats.includes(s));

    let msg = "";
    if (alreadyBooked.length) msg += `Ghế ${alreadyBooked.join(", ")} đã được đặt. `;
    if (notExist.length) msg += `Ghế ${notExist.join(", ")} không tồn tại. `;
    msg += `\nGhế còn trống: ${context.availableSeats.join(", ")}`;
    return { reply: msg, context };
  }

  const totalPrice = upperSeats.length * (context.ticketPrice || 0);

  let reply = `Xác nhận đặt vé:\n\n`;
  reply += `Tuyến: ${context.selectedRouteName}\n`;
  reply += `Khởi hành: ${formatDateTime(context.selectedTripDeparture)}\n`;
  reply += `Ghế: ${upperSeats.join(", ")}\n`;
  reply += `Số lượng: ${upperSeats.length} ghế\n`;
  reply += `Giá: ${formatCurrency(context.ticketPrice || 0)}/ghế\n`;
  reply += `Tổng tiền: ${formatCurrency(totalPrice)}\n\n`;
  reply += `Để đặt vé, vui lòng cung cấp thông tin:\n`;
  reply += `"Đặt vé, tên [Họ tên], sdt [Số điện thoại]"\n`;
  reply += `Ví dụ: "Đặt vé, tên Nguyễn Văn A, sdt 0901234567"`;

  return {
    reply,
    context: {
      ...context,
      step: "confirm_booking",
      selectedSeats: upperSeats,
      totalPrice,
    },
  };
}

async function handleConfirmBooking(parsed, context, userId) {
  if (!userId) {
    return {
      reply: "Bạn cần đăng nhập để đặt vé. Vui lòng đăng nhập và thử lại nhé!",
      context,
      requireAuth: true,
    };
  }

  if (context.step !== "confirm_booking" || !context.selectedSeats) {
    return { reply: "Bạn chưa chọn ghế. Hãy bắt đầu lại từ đầu nhé!", context: {} };
  }

  const name = parsed.passenger_name?.trim();
  const phone = parsed.passenger_phone?.trim();

  if (!name || !phone) {
    return {
      reply: "Vui lòng cung cấp đầy đủ họ tên và số điện thoại.\nVí dụ: \"Đặt vé, tên Nguyễn Văn A, sdt 0901234567\"",
      context,
    };
  }

  // Validate phone
  if (!/^(0[0-9]{8,10})$/.test(phone)) {
    return { reply: "Số điện thoại không hợp lệ. Vui lòng nhập lại (ví dụ: 0901234567)", context };
  }

  // Tạo booking với transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Kiểm tra trip còn SCHEDULED không
    const trip = await Trip.findById(context.selectedTripId).session(session);
    if (!trip || trip.status !== "SCHEDULED") {
      await session.abortTransaction();
      session.endSession();
      return { reply: "Chuyến xe này không còn nhận đặt vé. Bạn thử chuyến khác nhé!", context: {} };
    }

    // Kiểm tra ghế có bị đặt chưa (real-time)
    const existingOrders = await BookingOrder.find({
      trip_id: context.selectedTripId,
      order_status: { $ne: "CANCELLED" },
    }).select("seat_labels").session(session);

    const bookedSeats = existingOrders.flatMap((o) => o.seat_labels || []);
    const conflictSeats = context.selectedSeats.filter((s) => bookedSeats.includes(s));

    if (conflictSeats.length) {
      await session.abortTransaction();
      session.endSession();
      return {
        reply: `Ghế ${conflictSeats.join(", ")} vừa được người khác đặt. Vui lòng chọn ghế khác!`,
        context: { ...context, step: "select_seat", bookedSeats },
      };
    }

    // Tạo BookingOrder
    const [order] = await BookingOrder.create(
      [{
        user_id: userId,
        trip_id: context.selectedTripId,
        start_id: context.startRouteStopId,
        end_id: context.endRouteStopId,
        seat_labels: context.selectedSeats,
        order_status: "CREATED",
        total_price: context.totalPrice,
        passenger_name: name,
        passenger_phone: phone,
      }],
      { session }
    );

    // Tạo BookingPayment
    await BookingPayment.create(
      [{
        order_id: order._id,
        payment_method: "CASH_ON_BOARD",
        amount: context.totalPrice,
        payment_status: "PENDING",
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    let reply = `Đặt vé thành công!\n\n`;
    reply += `Mã đơn: ${order._id}\n`;
    reply += `Tuyến: ${context.selectedRouteName}\n`;
    reply += `Khởi hành: ${formatDateTime(context.selectedTripDeparture)}\n`;
    reply += `Ghế: ${context.selectedSeats.join(", ")}\n`;
    reply += `Hành khách: ${name} - ${phone}\n`;
    reply += `Tổng tiền: ${formatCurrency(context.totalPrice)}\n`;
    reply += `Thanh toán: Tiền mặt trên xe\n\n`;
    reply += `Cảm ơn bạn đã đặt vé! Bạn có muốn đặt thêm chuyến khác không?`;

    return { reply, context: {} };
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    session.endSession();
    console.error("[handleConfirmBooking]", err);
    return { reply: "Có lỗi xảy ra khi đặt vé. Vui lòng thử lại sau!", context };
  }
}

// ===================== MAIN HANDLER =====================

exports.chatAIV2 = async (req, res) => {
  try {
    const { message, history, context } = req.body;
    // userId có thể có hoặc không (nếu có auth middleware)
    const userId = res.locals.user?.id || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Tin nhắn không được trống" });
    }

    // Parse intent từ Ollama
    let parsed;
    try {
      parsed = await parseIntent(message, history, context);
    } catch (parseErr) {
      console.error("[parseIntent error]", parseErr.message);
      return res.json({
        reply: "Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn được không?\n\nVí dụ: \"Tôi muốn đi Đà Nẵng ra Huế ngày mai\"",
        context: context || {},
      });
    }

    console.log("[ChatAI V2] Parsed intent:", parsed);

    let result;

    switch (parsed.intent) {
      case "greeting":
        result = await handleGreeting();
        break;

      case "search_trip":
        if (!parsed.from || !parsed.to) {
          result = {
            reply: "Bạn muốn đi từ đâu đến đâu? Hãy cho tôi biết điểm đi và điểm đến nhé!\n\nVí dụ: \"Tôi muốn đi từ Đà Nẵng đến Huế ngày mai\"",
            context: context || {},
          };
        } else {
          result = await handleSearchTrip(parsed, context || {});
        }
        break;

      case "select_route":
        result = await handleSelectRoute(parsed, context || {});
        break;

      case "select_trip":
        result = await handleSelectTrip(parsed, context || {});
        break;

      case "select_seat":
        result = await handleSelectSeat(parsed, context || {});
        break;

      case "confirm_booking":
        result = await handleConfirmBooking(parsed, context || {}, userId);
        break;

      case "cancel":
        result = {
          reply: "Đã hủy. Bạn muốn tìm chuyến xe mới không? Hãy cho tôi biết bạn muốn đi đâu nhé!",
          context: {},
        };
        break;

      default:
        result = {
          reply: "Tôi chưa hiểu yêu cầu của bạn. Bạn có thể:\n• Tìm chuyến: \"Tôi muốn đi Đà Nẵng ra Huế ngày mai\"\n• Chọn tuyến: \"Chọn tuyến 1\"\n• Chọn chuyến: \"Chọn chuyến 2\"\n• Chọn ghế: \"Ghế A1, A2\"\n• Đặt vé: \"Đặt vé, tên Nguyễn Văn A, sdt 0901234567\"",
          context: context || {},
        };
    }

    return res.json({
      reply: result.reply,
      context: result.context,
      requireAuth: result.requireAuth || false,
    });
  } catch (err) {
    console.error("[chatAIV2]", err);
    return res.status(500).json({
      reply: "Có lỗi xảy ra. Vui lòng thử lại sau!",
      context: {},
    });
  }
};
