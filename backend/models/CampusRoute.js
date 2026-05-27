import mongoose from "mongoose";

const campusRouteSchema = new mongoose.Schema(
  {
    pairId: { type: String, required: true },
    fromCode: { type: String },
    fromName: { type: String, required: true },
    toCode: { type: String },
    toName: { type: String, required: true },
    directionNatural: { type: String, required: true },
    directionCardinal: { type: String },
    distanceMeters: { type: Number },
    walkMinutes: { type: Number },
    googleMapsUrl: { type: String },
    batch: { type: String }
  },
  { timestamps: true }
);

// Indexes for fast searching of building names
campusRouteSchema.index({ fromName: "text", toName: "text" });

const CampusRoute = mongoose.model("CampusRoute", campusRouteSchema);
export default CampusRoute;
