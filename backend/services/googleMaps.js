import MapCache from "../models/MapCache.js";

// In-memory cache to guarantee sub-millisecond lookup speeds for point pairs
const distanceCache = new Map();

/**
 * Formats raw seconds into human-friendly duration string
 */
function formatDurationFromSeconds(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds} secs`;
  const mins = Math.round(totalSeconds / 60);
  return `${mins} min${mins > 1 ? "s" : ""}`;
}

// Canonical landmarks on the Parul University Campus for geodesic path calculations
const CAMPUS_LANDMARKS = {
  "admin_block": { name: "Admin Block", lat: 22.2882, lng: 73.3638 },
  "new_building": { name: "New Building (Academic)", lat: 22.2891, lng: 73.3645 },
  "central_library": { name: "Central Library", lat: 22.2885, lng: 73.3640 },
  "engineering_block": { name: "Engineering Block (PIT)", lat: 22.2878, lng: 73.3630 },
  "pharmacy_block": { name: "Pharmacy Block", lat: 22.2889, lng: 73.3633 },
  "boys_hostel": { name: "Boys Hostel Block", lat: 22.2870, lng: 73.3650 },
  "girls_hostel": { name: "Girls Hostel Block", lat: 22.2875, lng: 73.3655 },
  "main_gate": { name: "PU Main Gate", lat: 22.2865, lng: 73.3625 },
  "management_block": { name: "Management Block (PIMR)", lat: 22.2895, lng: 73.3639 },
  "campus_hospital": { name: "PU Campus Hospital", lat: 22.2899, lng: 73.3622 }
};

/**
 * Standardize name matching to find coordinates for campus locations
 */
function identifyLandmark(text) {
  const t = text.toLowerCase();
  if (t.includes("admin")) return CAMPUS_LANDMARKS.admin_block;
  if (t.includes("new building") || t.includes("academic")) return CAMPUS_LANDMARKS.new_building;
  if (t.includes("library")) return CAMPUS_LANDMARKS.central_library;
  if (t.includes("engineering") || t.includes("pit") || t.includes("piet")) return CAMPUS_LANDMARKS.engineering_block;
  if (t.includes("pharmacy")) return CAMPUS_LANDMARKS.pharmacy_block;
  if (t.includes("boys")) return CAMPUS_LANDMARKS.boys_hostel;
  if (t.includes("girls")) return CAMPUS_LANDMARKS.girls_hostel;
  if (t.includes("hostel")) return CAMPUS_LANDMARKS.boys_hostel; // default
  if (t.includes("gate") || t.includes("entrance")) return CAMPUS_LANDMARKS.main_gate;
  if (t.includes("management") || t.includes("pimr") || t.includes("mba")) return CAMPUS_LANDMARKS.management_block;
  if (t.includes("hospital") || t.includes("medical") || t.includes("doctor")) return CAMPUS_LANDMARKS.campus_hospital;
  return null;
}

/**
 * Helper to formulate a canonical key that handles A->B and B->A searches identically
 */
function getCacheKey(origin, destination) {
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  return [o, d].sort().join("_to_");
}

/**
 * Preloads all persistent map cache records from MongoDB into memory
 */
export async function initMapCache() {
  try {
    const entries = await MapCache.find({}).lean();
    for (const entry of entries) {
      const key = getCacheKey(entry.origin, entry.destination);
      distanceCache.set(key, {
        distance: entry.distance,
        duration: entry.duration,
        source: entry.source
      });
    }
    console.log(`[Map Cache] Preloaded ${distanceCache.size} persistent point-to-point mappings into memory.`);
  } catch (error) {
    console.error("[Map Cache] Preloading failed:", error);
  }
}

/**
 * Haversine formula to compute walking distances on campus in the absence of an API key
 */
function calculateGeodesicDistance(locA, locB) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (locA.lat * Math.PI) / 180;
  const φ2 = (locB.lat * Math.PI) / 180;
  const Δφ = ((locB.lat - locA.lat) * Math.PI) / 180;
  const Δλ = ((locB.lng - locA.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // direct distance in meters

  // Add path factor (1.3) since campus walks are not perfectly straight lines
  const walkingDistance = Math.round(d * 1.3);
  
  // Average campus walking speed is roughly 1.2 m/s (4.3 km/h)
  const walkingDurationMinutes = Math.max(1, Math.round(walkingDistance / 1.2 / 60));

  return {
    distance: walkingDistance < 1000 ? `${walkingDistance} m` : `${(walkingDistance / 1000).toFixed(2)} km`,
    duration: `${walkingDurationMinutes} min${walkingDurationMinutes > 1 ? "s" : ""}`
  };
}

/**
 * Resolves point-to-point distance using Google Maps API or the campus geodesic fallback.
 * Automatically saves results to both in-memory and database caches.
 */
export async function resolveDistance(origin, destination) {
  const cleanOrigin = origin.trim();
  const cleanDestination = destination.trim();
  const key = getCacheKey(cleanOrigin, cleanDestination);

  // 1) Consult In-Memory cache (sub-millisecond)
  if (distanceCache.has(key)) {
    console.log(`[Map Cache] In-memory cache hit for key: "${key}"`);
    return distanceCache.get(key);
  }

  // 2) Attempt real Google Routes API if key is present
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      console.log(`[Map Cache] Querying Google Routes API for walking path: "${cleanOrigin}" to "${cleanDestination}"...`);
      // Scope query explicitly to Parul University to ensure absolute geocoding accuracy
      const originAddress = `${cleanOrigin}, Parul University, Vadodara, Gujarat, India`;
      const destAddress = `${cleanDestination}, Parul University, Vadodara, Gujarat, India`;
      
      // Google Routes API (computeRoutes) — the new generation API
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.localizedValues"
        },
        body: JSON.stringify({
          origin: { address: originAddress },
          destination: { address: destAddress },
          travelMode: "WALK",
          computeAlternativeRoutes: false,
          languageCode: "en"
        })
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Google Routes API returned status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const route = data?.routes?.[0];

      if (route) {
        // Use localizedValues for human-friendly text, fallback to raw meters/seconds
        const distanceText = route.localizedValues?.distance?.text 
          || (route.distanceMeters < 1000 
            ? `${route.distanceMeters} m` 
            : `${(route.distanceMeters / 1000).toFixed(2)} km`);
        const durationText = route.localizedValues?.duration?.text 
          || formatDurationFromSeconds(parseInt(route.duration?.replace("s", "") || "0"));
        const source = "Google Routes API";

        const result = { distance: distanceText, duration: durationText, source };

        // Save to in-memory map
        distanceCache.set(key, result);

        // Persistent save in MongoDB
        try {
          await MapCache.create({
            origin: cleanOrigin,
            destination: cleanDestination,
            distance: distanceText,
            duration: durationText,
            source
          });
        } catch (dbErr) {
          // Ignore unique index duplicates on parallel races
          if (dbErr.code !== 11000) console.error("[Map Cache] DB Save failed:", dbErr);
        }

        console.log(`[Map Cache] Google Routes API resolved: ${distanceText} in ${durationText}. Saved to database.`);
        return result;
      } else {
        console.warn(`[Map Cache] Google Routes API could not find a walking route. Falling back to campus simulator...`);
      }
    } catch (apiError) {
      console.error("[Map Cache] Google Routes API Error:", apiError);
    }
  } else {
    console.log("[Map Cache] GOOGLE_MAPS_API_KEY is not configured. Utilizing PU Geodesic Campus Landmark Simulator...");
  }

  // 3) Fallback: PU Geodesic Campus Landmark Simulator
  const landmarkA = identifyLandmark(cleanOrigin);
  const landmarkB = identifyLandmark(cleanDestination);

  let distance, duration;
  const source = "Campus Geodesic Simulator";

  if (landmarkA && landmarkB) {
    // Both landmarks recognized
    const calculated = calculateGeodesicDistance(landmarkA, landmarkB);
    distance = calculated.distance;
    duration = calculated.duration;
    console.log(`[Map Cache Simulator] Mapped "${cleanOrigin}" (${landmarkA.name}) to "${cleanDestination}" (${landmarkB.name}) -> ${distance}, ${duration}`);
  } else {
    // Generic fallback for unmapped custom labels
    console.log(`[Map Cache Simulator] Landmark mismatch. Returning standard campus geodetic estimate.`);
    distance = "320 m";
    duration = "4 mins";
  }

  const result = { distance, duration, source };
  distanceCache.set(key, result);

  // Persistent save in MongoDB
  try {
    await MapCache.create({
      origin: cleanOrigin,
      destination: cleanDestination,
      distance,
      duration,
      source
    });
  } catch (dbErr) {
    if (dbErr.code !== 11000) console.error("[Map Cache] DB Save failed:", dbErr);
  }

  return result;
}
