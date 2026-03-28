const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import all models
const Role = require("../model/Role");
const User = require("../model/Users");
const BusType = require("../model/BusType");
const Bus = require("../model/Bus");
const Stop = require("../model/Stops");
const Route = require("../model/Routers");
const RouteStop = require("../model/route_stops");
const StopLocation = require("../model/StopLocation");
const Trip = require("../model/Trip");
const BookingOrder = require("../model/BookingOrder");
const Booking_Order_detail = require("../model/Booking_Order_detail");
const BookingLocation = require("../model/BookingLocation");
const BookingPayment = require("../model/BookingPayment");
const PaymentTransaction = require("../model/PaymentTransaction");
const Parcel = require("../model/Parcel");
const ParcelStatusLog = require("../model/ParcelStatusLog");
const PricingConfig = require("../model/PricingConfig");
const RouteSegmentPrice = require("../model/RouteSegmentPrice");
const TripReview = require("../model/TripReview");
const LuggageLog = require("../model/LuggageLog");
const ReportIssueBus = require("../model/ReportIssueBus");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB Connected!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Hash password utility
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Load JSON data
const loadJsonData = (collectionName) => {
  const filePath = path.join(__dirname, "exports", `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File ${filePath} not found, skipping ${collectionName}`);
    return [];
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data;
};

// Clear database
const clearDatabase = async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop();
  }
  console.log("🗑️ Cleared existing database");
};

// Import data with references mapping
const importData = async () => {
  try {
    console.log("📥 Starting data import from JSON files...");

    // Load all data
    const rolesData = loadJsonData("roles");
    const busTypesData = loadJsonData("bustypes");
    const stopsData = loadJsonData("stops");
    const stopLocationsData = loadJsonData("stoplocations");
    const busesData = loadJsonData("buses");
    const usersData = loadJsonData("users");
    const routesData = loadJsonData("routes");
    const routeStopsData = loadJsonData("routestops");
    const pricingConfigsData = loadJsonData("pricingconfigs");
    const routeSegmentPricesData = loadJsonData("routesegmentprices");
    const tripsData = loadJsonData("trips");
    const bookingOrdersData = loadJsonData("bookingorders");
    const bookingOrderDetailsData = loadJsonData("booking_order_details");
    const bookingLocationsData = loadJsonData("bookinglocations");
    const bookingPaymentsData = loadJsonData("bookingpayments");
    const parcelsData = loadJsonData("parcels");
    const paymentTransactionsData = loadJsonData("paymenttransactions");
    const parcelStatusLogsData = loadJsonData("parcelstatuslogs");
    const tripReviewsData = loadJsonData("tripreviews");
    const luggageLogsData = loadJsonData("luggagelogs");
    const reportIssueBusData = loadJsonData("reportissuebuses");

    // Maps to store ObjectIds: old_id -> new_id
    const idMaps = {
      roles: new Map(),
      busTypes: new Map(),
      stops: new Map(),
      stopLocations: new Map(),
      buses: new Map(),
      users: new Map(),
      routes: new Map(),
      routeStops: new Map(),
      pricingConfigs: new Map(),
      routeSegmentPrices: new Map(),
      trips: new Map(),
      bookingOrders: new Map(),
      bookingOrderDetails: new Map(),
      bookingLocations: new Map(),
      bookingPayments: new Map(),
      parcels: new Map(),
      paymentTransactions: new Map(),
      parcelStatusLogs: new Map(),
      tripReviews: new Map(),
      luggageLogs: new Map(),
      reportIssueBus: new Map(),
    };

    // 1. Seed Roles
    if (rolesData.length > 0) {
      const roles = await Role.insertMany(rolesData);
      roles.forEach((role, index) => idMaps.roles.set(rolesData[index]._id, role._id));
      console.log(`✅ Imported ${roles.length} roles`);
    }

    // 2. Seed BusTypes
    if (busTypesData.length > 0) {
      const busTypes = await BusType.insertMany(busTypesData);
      busTypes.forEach((bt, index) => idMaps.busTypes.set(busTypesData[index].name, bt._id));
      console.log(`✅ Imported ${busTypes.length} bus types`);
    }

    // 3. Seed Stops
    if (stopsData.length > 0) {
      const stops = await Stop.insertMany(stopsData);
      stops.forEach((stop, index) => idMaps.stops.set(stopsData[index].name, stop._id));
      console.log(`✅ Imported ${stops.length} stops`);
    }

    // 4. Seed StopLocations (update stop_id references)
    if (stopLocationsData.length > 0) {
      const updatedStopLocations = stopLocationsData.map(loc => ({
        ...loc,
        stop_id: idMaps.stops.get(loc.stop_id) || loc.stop_id, // Try to map by name or keep original
      }));
      const stopLocations = await StopLocation.insertMany(updatedStopLocations);
      stopLocations.forEach((sl, index) => idMaps.stopLocations.set(stopLocationsData[index].location_name, sl._id));
      console.log(`✅ Imported ${stopLocations.length} stop locations`);
    }

    // 5. Seed Buses (update bus_type_id references)
    if (busesData.length > 0) {
      const updatedBuses = busesData.map(bus => ({
        ...bus,
        bus_type_id: idMaps.busTypes.get(bus.bus_type_id) || bus.bus_type_id,
      }));
      const buses = await Bus.insertMany(updatedBuses);
      buses.forEach((bus, index) => idMaps.buses.set(busesData[index].license_plate, bus._id));
      console.log(`✅ Imported ${buses.length} buses`);
    }

    // 6. Seed Users (update role references and hash passwords)
    if (usersData.length > 0) {
      const updatedUsers = [];
      for (const user of usersData) {
        const updatedUser = {
          ...user,
          role: idMaps.roles.get(user.role) || user.role,
        };
        if (user.password && !user.password.startsWith('$2')) { // If not already hashed
          updatedUser.password = await hashPassword(user.password);
        }
        updatedUsers.push(updatedUser);
      }
      const users = await User.insertMany(updatedUsers);
      users.forEach((user, index) => idMaps.users.set(usersData[index].phone, user._id));
      console.log(`✅ Imported ${users.length} users`);
    }

    // 7. Seed Routes (update stop references)
    if (routesData.length > 0) {
      const updatedRoutes = routesData.map(route => ({
        ...route,
        start_id: idMaps.stops.get(route.start_id) || route.start_id,
        stop_id: idMaps.stops.get(route.stop_id) || route.stop_id,
      }));
      const routes = await Route.insertMany(updatedRoutes);
      routes.forEach((route, index) => idMaps.routes.set(routesData[index].start_id + '-' + routesData[index].stop_id, route._id));
      console.log(`✅ Imported ${routes.length} routes`);
    }

    // 8. Seed RouteStops (update references)
    if (routeStopsData.length > 0) {
      const updatedRouteStops = routeStopsData.map(rs => ({
        ...rs,
        route_id: idMaps.routes.get(rs.route_id) || rs.route_id,
        stop_id: idMaps.stops.get(rs.stop_id) || rs.stop_id,
      }));
      const routeStops = await RouteStop.insertMany(updatedRouteStops);
      routeStops.forEach((rs, index) => idMaps.routeStops.set(routeStopsData[index].route_id + '-' + routeStopsData[index].stop_id, rs._id));
      console.log(`✅ Imported ${routeStops.length} route stops`);
    }

    // 9. Seed PricingConfigs
    if (pricingConfigsData.length > 0) {
      const pricingConfigs = await PricingConfig.insertMany(pricingConfigsData);
      pricingConfigs.forEach((pc, index) => idMaps.pricingConfigs.set(pricingConfigsData[index].name, pc._id));
      console.log(`✅ Imported ${pricingConfigs.length} pricing configs`);
    }

    // 10. Seed RouteSegmentPrices (update references)
    if (routeSegmentPricesData.length > 0) {
      const updatedRouteSegmentPrices = routeSegmentPricesData.map(rsp => ({
        ...rsp,
        route_id: idMaps.routes.get(rsp.route_id) || rsp.route_id,
        start_id: idMaps.routeStops.get(rsp.start_id) || rsp.start_id,
        end_id: idMaps.routeStops.get(rsp.end_id) || rsp.end_id,
        bus_type_id: idMaps.busTypes.get(rsp.bus_type_id) || rsp.bus_type_id,
      }));
      const routeSegmentPrices = await RouteSegmentPrice.insertMany(updatedRouteSegmentPrices);
      console.log(`✅ Imported ${routeSegmentPrices.length} route segment prices`);
    }

    // 11. Seed Trips (update references)
    if (tripsData.length > 0) {
      const updatedTrips = tripsData.map(trip => ({
        ...trip,
        route_id: idMaps.routes.get(trip.route_id) || trip.route_id,
        bus_id: idMaps.buses.get(trip.bus_id) || trip.bus_id,
        drivers: trip.drivers.map(d => ({
          ...d,
          driver_id: idMaps.users.get(d.driver_id) || d.driver_id,
        })),
      }));
      const trips = await Trip.insertMany(updatedTrips);
      trips.forEach((trip, index) => idMaps.trips.set(tripsData[index].route_id + '-' + tripsData[index].departure_time, trip._id));
      console.log(`✅ Imported ${trips.length} trips`);
    }

    // 12. Seed BookingOrders (update references)
    if (bookingOrdersData.length > 0) {
      const updatedBookingOrders = bookingOrdersData.map(bo => ({
        ...bo,
        user_id: idMaps.users.get(bo.user_id) || bo.user_id,
        trip_id: idMaps.trips.get(bo.trip_id) || bo.trip_id,
        start_id: idMaps.routeStops.get(bo.start_id) || bo.start_id,
        end_id: idMaps.routeStops.get(bo.end_id) || bo.end_id,
      }));
      const bookingOrders = await BookingOrder.insertMany(updatedBookingOrders);
      bookingOrders.forEach((bo, index) => idMaps.bookingOrders.set(bookingOrdersData[index].user_id + '-' + bookingOrdersData[index].trip_id, bo._id));
      console.log(`✅ Imported ${bookingOrders.length} booking orders`);
    }

    // 13. Seed Booking_Order_details (update references)
    if (bookingOrderDetailsData.length > 0) {
      const updatedBookingOrderDetails = bookingOrderDetailsData.map(bod => ({
        ...bod,
        order_id: idMaps.bookingOrders.get(bod.order_id) || bod.order_id,
        trip_id: idMaps.trips.get(bod.trip_id) || bod.trip_id,
      }));
      const bookingOrderDetails = await Booking_Order_detail.insertMany(updatedBookingOrderDetails);
      bookingOrderDetails.forEach((bod, index) => idMaps.bookingOrderDetails.set(bookingOrderDetailsData[index].order_id + '-' + bookingOrderDetailsData[index].seat_code, bod._id));
      console.log(`✅ Imported ${bookingOrderDetails.length} booking order details`);
    }

    // 14. Seed BookingLocations (update references)
    if (bookingLocationsData.length > 0) {
      const updatedBookingLocations = bookingLocationsData.map(bl => ({
        ...bl,
        booking_id: idMaps.bookingOrderDetails.get(bl.booking_id) || bl.booking_id,
      }));
      const bookingLocations = await BookingLocation.insertMany(updatedBookingLocations);
      console.log(`✅ Imported ${bookingLocations.length} booking locations`);
    }

    // 15. Seed BookingPayments (update references)
    if (bookingPaymentsData.length > 0) {
      const updatedBookingPayments = bookingPaymentsData.map(bp => ({
        ...bp,
        order_id: idMaps.bookingOrders.get(bp.order_id) || bp.order_id,
      }));
      const bookingPayments = await BookingPayment.insertMany(updatedBookingPayments);
      console.log(`✅ Imported ${bookingPayments.length} booking payments`);
    }

    // 16. Seed Parcels (update references)
    if (parcelsData.length > 0) {
      const updatedParcels = parcelsData.map(parcel => ({
        ...parcel,
        trip_id: idMaps.trips.get(parcel.trip_id) || parcel.trip_id,
        sender_id: idMaps.users.get(parcel.sender_id) || parcel.sender_id,
        start_id: idMaps.routeStops.get(parcel.start_id) || parcel.start_id,
        end_id: idMaps.routeStops.get(parcel.end_id) || parcel.end_id,
        pickup_location_id: idMaps.stopLocations.get(parcel.pickup_location_id) || parcel.pickup_location_id,
        dropoff_location_id: idMaps.stopLocations.get(parcel.dropoff_location_id) || parcel.dropoff_location_id,
      }));
      const parcels = await Parcel.insertMany(updatedParcels);
      parcels.forEach((parcel, index) => idMaps.parcels.set(parcelsData[index].code, parcel._id));
      console.log(`✅ Imported ${parcels.length} parcels`);
    }

    // 17. Seed PaymentTransactions (update references)
    if (paymentTransactionsData.length > 0) {
      const updatedPaymentTransactions = paymentTransactionsData.map(pt => ({
        ...pt,
        payment_id: idMaps.bookingPayments.get(pt.payment_id) || pt.payment_id,
        parcel_id: idMaps.parcels.get(pt.parcel_id) || pt.parcel_id,
      }));
      const paymentTransactions = await PaymentTransaction.insertMany(updatedPaymentTransactions);
      console.log(`✅ Imported ${paymentTransactions.length} payment transactions`);
    }

    // 18. Seed ParcelStatusLogs (update references)
    if (parcelStatusLogsData.length > 0) {
      const updatedParcelStatusLogs = parcelStatusLogsData.map(psl => ({
        ...psl,
        parcel_id: idMaps.parcels.get(psl.parcel_id) || psl.parcel_id,
        updated_by: idMaps.users.get(psl.updated_by) || psl.updated_by,
      }));
      const parcelStatusLogs = await ParcelStatusLog.insertMany(updatedParcelStatusLogs);
      console.log(`✅ Imported ${parcelStatusLogs.length} parcel status logs`);
    }

    // 19. Seed TripReviews (update references)
    if (tripReviewsData.length > 0) {
      const updatedTripReviews = tripReviewsData.map(tr => ({
        ...tr,
        booking_id: idMaps.bookingOrders.get(tr.booking_id) || tr.booking_id,
        trip_id: idMaps.trips.get(tr.trip_id) || tr.trip_id,
        user_id: idMaps.users.get(tr.user_id) || tr.user_id,
      }));
      const tripReviews = await TripReview.insertMany(updatedTripReviews);
      console.log(`✅ Imported ${tripReviews.length} trip reviews`);
    }

    // 20. Seed LuggageLogs (update references)
    if (luggageLogsData.length > 0) {
      const updatedLuggageLogs = luggageLogsData.map(ll => ({
        ...ll,
        booking_id: idMaps.bookingOrderDetails.get(ll.booking_id) || ll.booking_id,
        trip_id: idMaps.trips.get(ll.trip_id) || ll.trip_id,
        confirmed_by: idMaps.users.get(ll.confirmed_by) || ll.confirmed_by,
      }));
      const luggageLogs = await LuggageLog.insertMany(updatedLuggageLogs);
      console.log(`✅ Imported ${luggageLogs.length} luggage logs`);
    }

    // 21. Seed ReportIssueBus (update references)
    if (reportIssueBusData.length > 0) {
      const updatedReportIssueBus = reportIssueBusData.map(rib => ({
        ...rib,
        driver_id: idMaps.users.get(rib.driver_id) || rib.driver_id,
      }));
      const reportIssueBus = await ReportIssueBus.insertMany(updatedReportIssueBus);
      console.log(`✅ Imported ${reportIssueBus.length} bus issue reports`);
    }

    console.log("🎉 Data import from JSON files completed successfully!");
  } catch (error) {
    console.error("❌ Import error:", error.message);
    process.exit(1);
  }
};

// Run import
const runImport = async () => {
  await connectDB();
  await clearDatabase();
  await importData();
  process.exit(0);
};

runImport();