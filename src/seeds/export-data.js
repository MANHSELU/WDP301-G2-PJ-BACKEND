const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

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

// List of all models/collections to export
const collections = [
  "roles",
  "bustypes",
  "stops",
  "stoplocations",
  "buses",
  "users",
  "routes",
  "routestops",
  "pricingconfigs",
  "routesegmentprices",
  "trips",
  "bookingorders",
  "booking_order_details",
  "bookinglocations",
  "bookingpayments",
  "parcels",
  "paymenttransactions",
  "parcelstatuslogs",
  "tripreviews",
  "luggagelogs",
  "reportissuebuses"
];

// Export data to JSON files
const exportData = async () => {
  try {
    console.log("📤 Starting data export...");

    const db = mongoose.connection.db;

    // Create exports directory if not exists
    const exportDir = path.join(__dirname, "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    for (const collectionName of collections) {
      console.log(`Exporting ${collectionName}...`);

      const collection = db.collection(collectionName);
      const data = await collection.find({}).toArray();

      // Remove timestamps if needed (optional), but keep _id for reference mapping
      const cleanData = data.map(doc => {
        const { created_at, updated_at, createdAt, updatedAt, ...rest } = doc;
        return rest;
      });

      const filePath = path.join(exportDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2));

      console.log(`✅ Exported ${data.length} documents to ${filePath}`);
    }

    console.log("🎉 Data export completed!");
  } catch (error) {
    console.error("❌ Export error:", error.message);
    process.exit(1);
  }
};

// Run export
const runExport = async () => {
  await connectDB();
  await exportData();
  process.exit(0);
};

runExport();