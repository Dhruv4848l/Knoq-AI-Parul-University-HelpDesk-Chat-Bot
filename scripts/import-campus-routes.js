import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

import CampusRoute from "../backend/models/CampusRoute.js";

const MONGODB_URI = process.env.MONGODB_URI;
const CSV_PATH = path.join(__dirname, "../PU_Campus_Navigation_Dataset_v3_verified.csv");

async function importRoutes() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in backend/.env");
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Read all CSV rows into memory first
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`📄 Parsed ${rows.length} rows from CSV`);

  // Upsert into MongoDB
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const doc = {
        pairId: row.pair_id?.trim(),
        fromCode: row.from_code?.trim(),
        fromName: row.from_name?.trim(),
        toCode: row.to_code?.trim(),
        toName: row.to_name?.trim(),
        directionNatural: row.direction_natural?.trim() || "Directions not available",
        directionCardinal: row.direction_cardinal?.trim() || "",
        distanceMeters: parseFloat(row.gps_distance_meters) || 0,
        walkMinutes: parseInt(row.est_walk_minutes) || 0,
        googleMapsUrl: row.google_maps_url?.trim() || "",
        batch: row.batch?.trim() || ""
      };

      if (!doc.pairId || !doc.fromName || !doc.toName) {
        errors++;
        continue;
      }

      const result = await CampusRoute.updateOne(
        { pairId: doc.pairId },
        { $set: doc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;

      // Progress every 500 rows
      if ((i + 1) % 500 === 0) {
        console.log(`  ⏳ Processed ${i + 1}/${rows.length} rows...`);
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  ⚠️ Error on row ${i + 1} (${row.pair_id}):`, err.message);
      }
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   📥 Inserted: ${inserted}`);
  console.log(`   🔄 Updated:  ${updated}`);
  console.log(`   ❌ Errors:   ${errors}`);

  // Verify total count
  const total = await CampusRoute.countDocuments();
  console.log(`   📊 Total CampusRoute documents in DB: ${total}`);

  // Clear stale semantic cache
  console.log("\n🧹 Clearing stale semantic cache...");
  try {
    const SemanticCache = mongoose.connection.collection("semanticcaches");
    const cacheResult = await SemanticCache.deleteMany({});
    console.log(`   🗑️  Deleted ${cacheResult.deletedCount} stale cache entries`);
  } catch (cacheErr) {
    console.log("   ℹ️  No semantic cache collection found (OK if first run)");
  }

  console.log("\n🎉 All done! Your chatbot can now answer navigation queries.");
  await mongoose.disconnect();
}

importRoutes().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
