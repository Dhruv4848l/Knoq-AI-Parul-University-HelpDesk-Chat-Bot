import mongoose from "mongoose";

const campusRouteSchema = new mongoose.Schema(
  {
    pairId: { type: String, required: true, unique: true },
    fromCode: { type: String },
    fromName: { type: String, required: true },
    toCode: { type: String },
    toName: { type: String, required: true },

    // Coordinates
    fromLat: { type: Number },
    fromLng: { type: Number },
    toLat: { type: Number },
    toLng: { type: Number },

    // Google Maps names / place IDs
    fromGmapsName: { type: String },
    toGmapsName: { type: String },
    fromPlaceId: { type: String },
    toPlaceId: { type: String },

    // Directions
    directionNatural: { type: String, required: true },
    directionCardinal: { type: String },
    passBy: { type: String },

    // Distance & time
    distanceMeters: { type: Number },
    walkMinutes: { type: Number },

    // URLs
    googleMapsUrl: { type: String },
    googleMapsEmbedUrl: { type: String },
    fromPinUrl: { type: String },
    toPinUrl: { type: String },

    batch: { type: String }
  },
  { timestamps: true }
);

// Indexes for fast searching of building names and codes
campusRouteSchema.index({ fromName: "text", toName: "text" });
campusRouteSchema.index({ fromCode: 1, toCode: 1 });

const CampusRoute = mongoose.model("CampusRoute", campusRouteSchema);
export default CampusRoute;
