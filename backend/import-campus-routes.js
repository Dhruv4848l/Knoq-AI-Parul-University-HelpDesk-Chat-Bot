import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import CampusRoute from "./models/CampusRoute.js";

const MONGODB_URI = process.env.MONGODB_URI;
const CSV_PATH = path.join(__dirname, "../PU_Campus_Navigation_Dataset_v3_verified.csv");

async function importRoutes() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Drop existing collection to avoid schema conflicts from the old version
  console.log("🗑️  Dropping old campusroutes collection (if any)...");
  try {
    await mongoose.connection.collection("campusroutes").drop();
    console.log("   Dropped successfully.");
  } catch (e) {
    console.log("   Collection didn't exist or already dropped — OK.");
  }

  // Read all CSV rows into memory
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`📄 Parsed ${rows.length} rows from CSV`);

  // Batch insert for speed
  const docs = [];
  let skipped = 0;

  for (const row of rows) {
    const pairId = row.pair_id?.trim();
    const fromName = row.from_name?.trim();
    const toName = row.to_name?.trim();

    if (!pairId || !fromName || !toName) {
      skipped++;
      continue;
    }

    docs.push({
      pairId,
      fromCode: row.from_code?.trim() || "",
      fromName,
      toCode: row.to_code?.trim() || "",
      toName,

      // Coordinates
      fromLat: parseFloat(row.from_lat) || 0,
      fromLng: parseFloat(row.from_lng) || 0,
      toLat: parseFloat(row.to_lat) || 0,
      toLng: parseFloat(row.to_lng) || 0,

      // Google Maps names / place IDs
      fromGmapsName: row.from_gmaps_name?.trim() || "",
      toGmapsName: row.to_gmaps_name?.trim() || "",
      fromPlaceId: row.from_place_id?.trim() || "",
      toPlaceId: row.to_place_id?.trim() || "",

      // Directions
      directionNatural: row.direction_natural?.trim() || "Directions not available",
      directionCardinal: row.direction_cardinal?.trim() || "",
      passBy: row.pass_by?.trim() || "",

      // Distance & time
      distanceMeters: parseFloat(row.gps_distance_meters) || 0,
      walkMinutes: parseInt(row.est_walk_minutes) || 0,

      // URLs
      googleMapsUrl: row.google_maps_url?.trim() || "",
      googleMapsEmbedUrl: row.google_maps_embed_url?.trim() || "",
      fromPinUrl: row.from_pin_url?.trim() || "",
      toPinUrl: row.to_pin_url?.trim() || "",

      batch: row.batch?.trim() || ""
    });
  }

  console.log(`📦 Inserting ${docs.length} documents (skipped ${skipped} invalid rows)...`);

  // Insert in batches of 500 for reliability
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await CampusRoute.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log(`  ⏳ Inserted ${inserted}/${docs.length}...`);
  }

  // Verify total count
  const total = await CampusRoute.countDocuments();
  console.log(`\n✅ Import complete!`);
  console.log(`   📊 Total CampusRoute documents in DB: ${total}`);

  // Verify a sample
  const sample = await CampusRoute.findOne({ pairId: "A1-A5" }).lean();
  if (sample) {
    console.log(`\n📌 Sample route (A1-A5):`);
    console.log(`   From: ${sample.fromName} (${sample.fromCode}) @ [${sample.fromLat}, ${sample.fromLng}]`);
    console.log(`   To:   ${sample.toName} (${sample.toCode}) @ [${sample.toLat}, ${sample.toLng}]`);
    console.log(`   Distance: ${sample.distanceMeters}m, Walk: ${sample.walkMinutes} mins`);
    console.log(`   Maps URL: ${sample.googleMapsUrl?.substring(0, 80)}...`);
  }

  // Clear stale semantic cache
  console.log("\n🧹 Clearing stale semantic cache...");
  try {
    const cacheResult = await mongoose.connection.collection("semanticcaches").deleteMany({});
    console.log(`   🗑️  Deleted ${cacheResult.deletedCount} stale cache entries`);
  } catch (cacheErr) {
    console.log("   ℹ️  No semantic cache collection found (OK if first run)");
  }

  // Print all unique building codes for reference
  const fromCodes = await CampusRoute.distinct("fromCode");
  const toCodes = await CampusRoute.distinct("toCode");
  const allCodes = [...new Set([...fromCodes, ...toCodes])].filter(Boolean).sort();
  console.log(`\n📋 ${allCodes.length} unique building codes: ${allCodes.join(", ")}`);

  console.log("\n🎉 All done! Your chatbot can now answer navigation queries.");
  await mongoose.disconnect();
}

importRoutes().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
