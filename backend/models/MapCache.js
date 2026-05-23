import mongoose from "mongoose";

const mapCacheSchema = new mongoose.Schema({
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  distance: { type: String, required: true }, // e.g. "450 m"
  duration: { type: String, required: true }, // e.g. "5 mins"
  source: { type: String, required: true },   // e.g. "Google Maps API" or "Campus Simulator"
  createdAt: { type: Date, default: Date.now }
});

// Ensure a compound unique index so we don't have duplicated entries for point pairs
mapCacheSchema.index({ origin: 1, destination: 1 }, { unique: true });

const MapCache = mongoose.model("MapCache", mapCacheSchema);
export default MapCache;
