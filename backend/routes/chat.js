import express from "express";
import z from "zod";
import Faq from "../models/Faq.js";
import ChatLog from "../models/ChatLog.js";
import CampusRoute from "../models/CampusRoute.js";
import { requireAuth } from "../middleware/auth.js";
import { ragSearch } from "../services/rag.js";
import { chatCompletion } from "../services/gemini.js";
import { getSemanticCachedResponse, saveToSemanticCache } from "../services/semanticCache.js";
import { resolveDistance } from "../services/googleMaps.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
//  LEVENSHTEIN DISTANCE — fuzzy matching with max 2 char tolerance
// ═══════════════════════════════════════════════════════════════════════════
function levenshtein(a, b) {
  const al = a.length, bl = b.length;
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
    }
  }
  return dp[al][bl];
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDING CODE → NAME MAPPING (comprehensive, from CSV + user aliases)
//  Users refer to buildings by short codes; these map to DB names
// ═══════════════════════════════════════════════════════════════════════════
const CODE_TO_BUILDING = {
  // Academic blocks (A-series)
  "A1":  { name: "Parul Institute of Engineering & Technology (Main)", code: "A1" },
  "A2":  { name: "Parul Institute of Engineering & Technology (Diploma & HR)", code: "A2" },
  "A3":  { name: "Parul Institute of Engineering & Technology (D Block)", code: "A3" },
  "A4":  { name: "Parul Institute of Pharmacy", code: "A4" },
  "A5":  { name: "Parul Institute of Engineering & Technology (Diploma Studies) and Gymnasium", code: "A5" },
  "A6":  { name: "Parul Institute of Nursing", code: "A6" },
  "A7":  { name: "Jawaharlal Nehru Homoeopathic Medical College and Parul Institute of Physiotherapy", code: "A7" },
  "A8":  { name: "Parul Institute of Pharmacy & Research and Office of Doctoral Studies", code: "A8" },
  "A9":  { name: "Parul Polytechnic Institute", code: "A9" },
  "A10": { name: "School of Pharmacy", code: "A10" },
  "A11": { name: "Medical Library & Insights-Centre for Counselling and Psychological", code: "A11" },
  "A12": { name: "Parul Institute of Medical Sciences & Research", code: "A12" },
  "A13": { name: "Parul Institute of Ayurved", code: "A13" },
  "A14": { name: "Parul Institute of Business Administration and Parul Institute of Computer Application", code: "A14" },
  "A15": { name: "Parul Institute of Management & Research", code: "A15" },
  "A16": { name: "Parul Institute of Architecture & Research and Parul Institute of Physiotherapy & Research", code: "A16" },
  "A17": { name: "Parul Institute of Homeopathy & Research", code: "A17" },
  "A18": { name: "Parul Institute of Ayurved & Research", code: "A18" },
  "A19": { name: "Parul Institute of Technology", code: "A19" },
  "A20": { name: "Engineering Workshop", code: "A20" },
  "A21": { name: "Parul Institute of Applied Sciences and Parul Institute of Pharmaceutical Education & Research", code: "A21" },
  "A22": { name: "Parul Institute of Design, Parul Institute of Fine Arts, Parul Institute of Performing Arts", code: "A22" },
  "A23": { name: "Subhash Chandra Bose Bhawan (Commerce, Arts, Agriculture, Social Work, etc.)", code: "A23" },
  "A24": { name: "Bhagat Singh Bhawan", code: "A24" },

  // Bank
  "B1":  { name: "Central Bank of India", code: "B1" },

  // Central blocks
  "C1":  { name: "Student Section (Scholarship, Accounts, Transport, ERP, Library, Harmony Hall, West Hall, Hostel Section, Exam Section)", code: "C1" },
  "C2":  { name: "Admission Cell (Placement Cell, IQAC, South Hall, North Hall)", code: "C2" },
  "C3":  { name: "International Relation Cell (Student Welfare, Alumni, Entrepreneurship, Purchase, Technical & Cultural, Internship, East Hall)", code: "C3" },

  // Hospital / Emergency
  "E1":  { name: "Parul Ayurved Hospital", code: "E1" },
  "E2":  { name: "Parul Sevashram Hospital", code: "E2" },
  "E3":  { name: "Khemdas Ayurved Hospital", code: "E3" },
  "E4":  { name: "Parul Institute of Homeopathy & Research Hospital", code: "E4" },
  "E5":  { name: "Jawaharlal Nehru Homoeopathic Medical College Hospital", code: "E5" },

  // Hostels (H-series)
  "H1":  { name: "Shastri Bhawan A", code: "H1" },
  "H2":  { name: "Shastri Bhawan B", code: "H2" },
  "H3":  { name: "Shastri Bhawan C", code: "H3" },
  "H4":  { name: "Marie Curie Residence", code: "H4" },
  "H5":  { name: "Sarojini Bhawan A", code: "H5" },
  "H6":  { name: "Sarojini Bhawan B", code: "H6" },
  "H7":  { name: "Sarojini Bhawan C", code: "H7" },
  "H8":  { name: "Indira Bhawan A", code: "H8" },
  "H9":  { name: "Indira Bhawan B", code: "H9" },
  "H10": { name: "Indira Bhawan C", code: "H10" },
  "H11": { name: "Albert Einestein Residence", code: "H11" },
  "H12": { name: "Kalam Bhawan C", code: "H12" },
  "H13": { name: "Kalam Bhawan B", code: "H13" },
  "H14": { name: "Kalam Bhawan A", code: "H14" },
  "H15": { name: "Tagore Bhawan A", code: "H15" },
  "H16": { name: "Tagore Bhawan B", code: "H16" },
  "H17": { name: "Dhyan Bhawan", code: "H17" },
  "H18": { name: "Janki Bhawan", code: "H18" },
  "H19": { name: "Teresa Bhawan A", code: "H19" },
  "H20": { name: "Teresa Bhawan B", code: "H20" },
  "H21": { name: "Teresa Bhawan C", code: "H21" },
  "H22": { name: "Teresa Bhawan D", code: "H22" },
  "H23": { name: "Tagore Bhawan C", code: "H23" },
  "H24": { name: "Tagore Bhawan D", code: "H24" },
  "H25": { name: "Savitri Bhawan A", code: "H25" },
  "H26": { name: "Shakuntla Bhawan", code: "H26" },
  "H27": { name: "Milkha Bhawan A", code: "H27" },
  "H28": { name: "Milkha Bhawan B", code: "H28" },
  "H29": { name: "Milkha Bhawan C", code: "H29" },
  "H30": { name: "Sardar Bhawan A", code: "H30" },
  "H31": { name: "Sardar Bhawan B", code: "H31" },
  "H32": { name: "Savitri Bhawan B", code: "H32" },
  "H33": { name: "Atal Bhawan A", code: "H33" },
};

// ═══════════════════════════════════════════════════════════════════════════
//  ALIAS MAP — common student nicknames / abbreviations → DB name + code
//  User said: A = Admin, N = Bhagat Singh, NB = Lakshya, L = CV Raman
// ═══════════════════════════════════════════════════════════════════════════
const BUILDING_ALIASES = {
  // ── Campus block letter aliases (user-confirmed) ─────────────────────────
  // A block = Admin Block (Admission Cell C2)
  "a block": "C2",
  "admin block": "C2",
  "admin": "C2",
  "admission": "C2",
  "admission cell": "C2",
  "admission block": "C2",

  // N block = Bhagat Singh Bhawan (A24)
  "n block": "A24",
  "n-block": "A24",
  "n block building": "A24",
  "bhagat singh": "A24",
  "bhagat singh bhawan": "A24",
  "bhagat singh building": "A24",
  "bhagat singh block": "A24",
  "bhagat": "A24",

  // NB = Lakshya Block / Parul Institute of Technology (A19)
  "nb block": "A19",
  "nb": "A19",
  "nb building": "A19",
  "lakshya": "A19",
  "lakshya block": "A19",
  "lakshya building": "A19",

  // L block = CV Raman Building / Subhash Chandra Bose Bhawan (A23)
  "l block": "A23",
  "l-block": "A23",
  "l block building": "A23",
  "cv raman": "A23",
  "cv raman building": "A23",
  "cv raman block": "A23",
  "law block": "A23",
  "law": "A23",
  "arts": "A23",
  "arts block": "A23",
  "commerce": "A23",
  "commerce block": "A23",
  "agriculture": "A23",
  "social work": "A23",

  // D block / Ds = merged with A block engineering (A1 main complex, A3 is D Block wing)
  "d block": "A3",
  "d-block": "A3",
  "ds block": "A1",
  "ds": "A1",

  // ── Engineering ──────────────────────────────────────────────────────────
  "engineering": "A1",
  "engineering block": "A1",
  "piet": "A1",
  "main block": "A1",
  "diploma": "A2",
  "diploma block": "A2",
  "workshop": "A20",
  "engineering workshop": "A20",
  "pit": "A19",
  "technology": "A19",
  "technology block": "A19",

  // ── Pharmacy / Medical ───────────────────────────────────────────────────
  "pharmacy": "A4",
  "pharmacy block": "A4",
  "school of pharmacy": "A10",
  "medical": "A12",
  "medical block": "A12",
  "hospital": "E2",
  "sevashram": "E2",
  "sevashram hospital": "E2",
  "ayurved": "A13",
  "ayurved hospital": "E1",
  "khemdas": "E3",
  "nursing": "A6",
  "nursing block": "A6",
  "homeopathy": "A17",
  "homeopathy block": "A17",
  "physiotherapy": "A7",
  "dental": "A12",
  "medical library": "A11",
  "library": "A11",
  "counselling": "A11",

  // ── Management / Business ────────────────────────────────────────────────
  "management": "A15",
  "management block": "A15",
  "pimr": "A15",
  "mba": "A15",
  "bba": "A14",
  "bca": "A14",
  "mca": "A14",
  "business": "A14",

  // ── Design ───────────────────────────────────────────────────────────────
  "design": "A22",
  "design block": "A22",
  "fine arts": "A22",
  "performing arts": "A22",

  // ── Science ──────────────────────────────────────────────────────────────
  "science": "A21",
  "science block": "A21",
  "applied science": "A21",

  // ── Architecture ─────────────────────────────────────────────────────────
  "architecture": "A16",
  "architecture block": "A16",

  // ── Polytechnic ──────────────────────────────────────────────────────────
  "polytechnic": "A9",
  "polytechnic block": "A9",

  // ── Central blocks ───────────────────────────────────────────────────────
  "student section": "C1",
  "scholarship": "C1",
  "transport": "C1",
  "exam section": "C1",
  "hostel section": "C1",
  "placement": "C2",
  "placement cell": "C2",
  "iqac": "C2",
  "international": "C3",
  "alumni": "C3",
  "student welfare": "C3",

  // ── Bank ──────────────────────────────────────────────────────────────────
  "bank": "B1",
  "central bank": "B1",

  // ── Gymnasium ─────────────────────────────────────────────────────────────
  "gymnasium": "A5",
  "gym": "A5",

  // ── Hostels — boys ────────────────────────────────────────────────────────
  "shastri bhawan": "H1",
  "shastri": "H1",
  "kalam bhawan": "H14",
  "kalam": "H14",
  "tagore bhawan": "H15",
  "tagore": "H15",
  "dhyan bhawan": "H17",
  "dhyan": "H17",
  "atal bhawan": "H33",
  "atal": "H33",
  "milkha bhawan": "H27",
  "milkha": "H27",
  "sardar bhawan": "H30",
  "sardar": "H30",
  "albert einstein": "H11",
  "einstein": "H11",
  "boys hostel": "H1",

  // ── Hostels — girls ───────────────────────────────────────────────────────
  "sarojini bhawan": "H5",
  "sarojini": "H5",
  "indira bhawan": "H8",
  "indira": "H8",
  "teresa bhawan": "H19",
  "teresa": "H19",
  "janki bhawan": "H18",
  "janki": "H18",
  "savitri bhawan": "H25",
  "savitri": "H25",
  "shakuntla bhawan": "H26",
  "shakuntla": "H26",
  "marie curie": "H4",
  "girls hostel": "H5",
  "hostel": "H1",
};

// ═══════════════════════════════════════════════════════════════════════════
//  BUILD RUNTIME CACHES — loaded once on first query
// ═══════════════════════════════════════════════════════════════════════════
let ALL_BUILDING_NAMES = null;

async function getAllBuildingNames() {
  if (ALL_BUILDING_NAMES) return ALL_BUILDING_NAMES;
  try {
    const fromNames = await CampusRoute.distinct("fromName");
    const toNames = await CampusRoute.distinct("toName");
    ALL_BUILDING_NAMES = [...new Set([...fromNames, ...toNames])];
    console.log(`[Nav] Loaded ${ALL_BUILDING_NAMES.length} unique building names for fuzzy matching`);
    return ALL_BUILDING_NAMES;
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  FUZZY MATCH BUILDING — ≤2 char Levenshtein tolerance, else "doesn't exist"
// ═══════════════════════════════════════════════════════════════════════════
async function fuzzyMatchBuilding(userInput) {
  const input = userInput.trim().toLowerCase();

  // 1) Exact code match (e.g., "A1", "H5", "C2")
  const upperInput = input.toUpperCase();
  if (CODE_TO_BUILDING[upperInput]) {
    return { matched: true, name: CODE_TO_BUILDING[upperInput].name, code: upperInput };
  }

  // 2) Strip "block/building/bhawan" suffix and try as code
  //    e.g., "a1 block" → "A1", "h5 building" → "H5"
  const codeFromInput = input.replace(/\s*(block|building|bhawan|bhavan)\s*$/i, "").trim();
  const codeUpper = codeFromInput.replace(/[\s\-_.]/g, "").toUpperCase();
  if (codeUpper !== upperInput && CODE_TO_BUILDING[codeUpper]) {
    return { matched: true, name: CODE_TO_BUILDING[codeUpper].name, code: codeUpper };
  }

  // 3) Exact alias match
  if (BUILDING_ALIASES[input]) {
    const code = BUILDING_ALIASES[input];
    return { matched: true, name: CODE_TO_BUILDING[code].name, code };
  }

  // 4) Also try with "block"/"building" stripped for alias lookup
  const inputStripped = codeFromInput.toLowerCase();
  if (inputStripped !== input && BUILDING_ALIASES[inputStripped]) {
    const code = BUILDING_ALIASES[inputStripped];
    return { matched: true, name: CODE_TO_BUILDING[code].name, code };
  }

  // 5) Fuzzy code match (e.g., "a1" typed as "A 1" or "a-1")
  const cleanedCode = input.replace(/[\s\-_.]/g, "").toUpperCase();
  if (CODE_TO_BUILDING[cleanedCode]) {
    return { matched: true, name: CODE_TO_BUILDING[cleanedCode].name, code: cleanedCode };
  }

  // 6) Fuzzy alias match (Levenshtein ≤ 2)
  let bestAlias = null;
  let bestAliasDist = Infinity;
  for (const [alias, code] of Object.entries(BUILDING_ALIASES)) {
    const dist = levenshtein(input, alias);
    if (dist <= 2 && dist < bestAliasDist) {
      bestAliasDist = dist;
      bestAlias = { alias, code };
    }
  }
  if (bestAlias) {
    const building = CODE_TO_BUILDING[bestAlias.code];
    return {
      matched: true,
      name: building.name,
      code: bestAlias.code,
      correctedFrom: bestAlias.alias
    };
  }

  // 5) Direct substring match against all DB building names
  const allNames = await getAllBuildingNames();
  for (const name of allNames) {
    if (name.toLowerCase().includes(input) || input.includes(name.toLowerCase())) {
      return { matched: true, name };
    }
  }

  // 6) Levenshtein ≤ 2 against full building names and their words
  let bestMatch = null;
  let bestDistance = Infinity;
  for (const name of allNames) {
    const nameLower = name.toLowerCase();
    const dist = levenshtein(input, nameLower);
    if (dist <= 2 && dist < bestDistance) {
      bestDistance = dist;
      bestMatch = name;
    }
    // Also check significant words within the building name
    const words = nameLower.split(/[\s,()&]+/).filter(w => w.length >= 3);
    for (const word of words) {
      if (Math.abs(word.length - input.length) <= 2) {
        const wDist = levenshtein(input, word);
        if (wDist <= 2 && wDist < bestDistance) {
          bestDistance = wDist;
          bestMatch = name;
        }
      }
    }
  }
  if (bestMatch) {
    return { matched: true, name: bestMatch, correctedFrom: bestMatch };
  }

  // ❌ No match within 2-char tolerance — building doesn't exist
  return { matched: false, name: userInput };
}

// ═══════════════════════════════════════════════════════════════════════════
//  DETECT WHAT SPECIFIC INFO THE USER WANTS
// ═══════════════════════════════════════════════════════════════════════════
function detectQueryIntent(query) {
  const q = query.toLowerCase();
  const intents = [];

  if (/(distance|how far|how many meters|how many km|kitna dur)/i.test(q)) intents.push("distance");
  if (/(path|direction|how to reach|way from|route|navigate|walk to|go to|get to|take me|guide me|show.*way|which way)/i.test(q)) intents.push("path");
  if (/(google.*map|map.*link|navigation.*link|map.*url|open.*map)/i.test(q)) intents.push("map_link");
  if (/(coordinate|lat|lng|latitude|longitude|location.*coordinate|gps)/i.test(q)) intents.push("coordinates");
  if (/(walking time|walk.*time|time.*walk|how long|kitna time|estimated time|est.*time)/i.test(q)) intents.push("walk_time");
  if (/(pin|pin.*url|location.*pin|google.*pin)/i.test(q)) intents.push("pin");
  
  // If no specific intent detected but it's a navigation query, return "full"
  if (intents.length === 0) intents.push("full");

  return intents;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDING INFO LOOKUP — "what is A1?", "tell me about N block"
// ═══════════════════════════════════════════════════════════════════════════
async function handleBuildingInfoQuery(query) {
  const q = query.toLowerCase().trim();

  // Detect: "what is X?", "tell me about X", "which building is X?", "X block name", "X kya hai", "building code X"
  const infoPatterns = [
    /(?:what|which|where)\s+(?:is|building|block)\s+(.+?)[\s?]*$/i,
    /(?:tell|know|info|about|details)\s+(?:me\s+)?(?:about\s+)?(.+?)[\s?]*$/i,
    /(?:building|block)\s+(?:name|info|details)\s+(?:of|for)\s+(.+?)[\s?]*$/i,
    /(?:which|what)\s+(?:is\s+)?(?:the\s+)?(?:name\s+)?(?:of\s+)?(?:building|block)\s+(.+?)[\s?]*$/i,
    /^([a-z]\d{1,2})[\s?]*$/i,       // just a code like "A1", "H5"
    /^([a-z]{1,2}\s*\d{0,2}\s*block)[\s?]*$/i,  // "n block", "l block", "d block"
    /(?:building)\s+code\s+(.+?)[\s?]*$/i,
  ];

  let extractedName = null;
  for (const pattern of infoPatterns) {
    const match = q.match(pattern);
    if (match) {
      extractedName = match[1].trim();
      break;
    }
  }

  if (!extractedName) return null;

  // Try to match the building
  const buildingMatch = await fuzzyMatchBuilding(extractedName);

  if (!buildingMatch.matched) {
    return {
      reply: `🚫 Sorry, there is no building or hostel called **"${extractedName}"** on the Parul University campus. Please check the name/code and try again.\n\n💡 **Tip**: Use codes like A1-A24 (academic), H1-H33 (hostels), C1-C3 (central), E1-E5 (hospitals), or B1 (bank).`,
      source: "dataset"
    };
  }

  // Get a sample route to extract coordinates and other info
  const sampleRoute = await CampusRoute.findOne({
    $or: [
      { fromCode: buildingMatch.code },
      { toCode: buildingMatch.code },
      { fromName: new RegExp(buildingMatch.name.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0, 3).join(".*"), "i") },
      { toName: new RegExp(buildingMatch.name.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0, 3).join(".*"), "i") },
    ]
  }).lean();

  let lat, lng, pinUrl, gmapsName;
  if (sampleRoute) {
    const isFrom = sampleRoute.fromCode === buildingMatch.code ||
                   sampleRoute.fromName.toLowerCase().includes(buildingMatch.name.toLowerCase().substring(0, 15));
    if (isFrom) {
      lat = sampleRoute.fromLat;
      lng = sampleRoute.fromLng;
      pinUrl = sampleRoute.fromPinUrl;
      gmapsName = sampleRoute.fromGmapsName;
    } else {
      lat = sampleRoute.toLat;
      lng = sampleRoute.toLng;
      pinUrl = sampleRoute.toPinUrl;
      gmapsName = sampleRoute.toGmapsName;
    }
  }

  let correctionNote = "";
  if (buildingMatch.correctedFrom && buildingMatch.correctedFrom.toLowerCase() !== extractedName.toLowerCase()) {
    correctionNote = `\n✏️ _Auto-corrected from "${extractedName}" → **${buildingMatch.correctedFrom}**_\n`;
  }

  const codeLabel = buildingMatch.code ? ` (${buildingMatch.code})` : "";
  let reply = `🏛️ **Building Information**${correctionNote}\n\n**${buildingMatch.name}**${codeLabel}\n`;

  if (lat && lng && lat !== 0) {
    reply += `\n📍 **Coordinates**: ${lat}, ${lng}`;
  }
  if (gmapsName) {
    reply += `\n🏷️ **Google Maps Name**: ${gmapsName}`;
  }
  if (pinUrl) {
    reply += `\n📌 [**View on Google Maps →**](${pinUrl})`;
  }
  if (lat && lng && lat !== 0 && !pinUrl) {
    reply += `\n📌 [**View on Google Maps →**](https://www.google.com/maps?q=${lat},${lng})`;
  }

  // Count how many routes connect to this building
  const routeCount = await CampusRoute.countDocuments({
    $or: [
      { fromCode: buildingMatch.code },
      { toCode: buildingMatch.code }
    ]
  });
  if (routeCount > 0) {
    reply += `\n\n📊 This building has **${routeCount} navigation routes** in our dataset to/from other campus locations.`;
  }

  return { reply, source: "dataset" };
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORMAT ROUTE RESPONSE — based on what user specifically asked for
// ═══════════════════════════════════════════════════════════════════════════
function formatRouteResponse(route, intents, originMatch, destMatch, correctionNote) {
  const isFrom = route.fromName.toLowerCase().includes(originMatch.name.toLowerCase().substring(0, 10)) ||
                 route.fromCode === originMatch.code;
  const fromName = isFrom ? route.fromName : route.toName;
  const toName = isFrom ? route.toName : route.fromName;
  const fromLat = isFrom ? route.fromLat : route.toLat;
  const fromLng = isFrom ? route.fromLng : route.toLng;
  const toLat = isFrom ? route.toLat : route.fromLat;
  const toLng = isFrom ? route.toLng : route.fromLng;
  const fromPin = isFrom ? route.fromPinUrl : route.toPinUrl;
  const toPin = isFrom ? route.toPinUrl : route.fromPinUrl;
  const direction = isFrom ? route.directionNatural : route.directionCardinal || route.directionNatural;
  const mapsUrl = route.googleMapsUrl || "";
  const embedUrl = route.googleMapsEmbedUrl || "";

  // If user wants everything ("full") or mixed intents
  if (intents.includes("full") || intents.length > 2) {
    let reply = `📍 **Campus Navigation**${correctionNote}\n\n`;
    reply += `**${fromName}** → **${toName}**\n\n`;
    reply += `* 📏 **Distance**: ${route.distanceMeters} meters\n`;
    reply += `* 🚶‍♂️ **Walk Time**: ~${route.walkMinutes} minute${route.walkMinutes > 1 ? "s" : ""}\n`;
    reply += `* 🗺️ **Source**: Parul University Official Dataset\n`;
    reply += `\n🧭 **Walking Directions**:\n${direction}`;
    if (fromLat && fromLng) reply += `\n\n📍 **${fromName} Coordinates**: ${fromLat}, ${fromLng}`;
    if (toLat && toLng) reply += `\n📍 **${toName} Coordinates**: ${toLat}, ${toLng}`;
    if (mapsUrl) reply += `\n\n🗺️ [**View Route on Google Maps →**](${mapsUrl})`;
    if (fromPin) reply += `\n📌 [**${fromName} on Maps →**](${fromPin})`;
    if (toPin) reply += `\n📌 [**${toName} on Maps →**](${toPin})`;
    reply += `\n\nHave a pleasant walk across campus! 🏫`;
    return reply;
  }

  // Specific intents — build targeted response
  let parts = [];
  parts.push(`📍 **${fromName}** → **${toName}**${correctionNote}\n`);

  if (intents.includes("distance")) {
    parts.push(`📏 **Distance**: ${route.distanceMeters} meters`);
  }
  if (intents.includes("walk_time")) {
    parts.push(`🚶‍♂️ **Estimated Walk Time**: ~${route.walkMinutes} minute${route.walkMinutes > 1 ? "s" : ""}`);
  }
  if (intents.includes("path")) {
    parts.push(`\n🧭 **Walking Directions**:\n${direction}`);
  }
  if (intents.includes("map_link")) {
    if (mapsUrl) parts.push(`\n🗺️ [**Google Maps Route →**](${mapsUrl})`);
    if (embedUrl) parts.push(`🗺️ [**Google Maps (alternate) →**](${embedUrl})`);
    if (!mapsUrl && !embedUrl) parts.push(`🗺️ No Google Maps link available for this route.`);
  }
  if (intents.includes("coordinates")) {
    if (fromLat && fromLng) parts.push(`\n📍 **${fromName}**: ${fromLat}, ${fromLng}`);
    if (toLat && toLng) parts.push(`📍 **${toName}**: ${toLat}, ${toLng}`);
  }
  if (intents.includes("pin")) {
    if (fromPin) parts.push(`📌 [**${fromName} Pin →**](${fromPin})`);
    if (toPin) parts.push(`📌 [**${toName} Pin →**](${toPin})`);
  }

  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOCAL REGEX PARSER — extracts origin/destination WITHOUT calling Gemini
//  This is the PRIMARY parser. Fast, reliable, no API dependency.
//  Uses GREEDY capture with explicit delimiters to avoid the lazy-match bug.
// ═══════════════════════════════════════════════════════════════════════════
function localParseLocations(query) {
  // Clean the query: remove trailing punctuation, normalize whitespace
  const q = query.trim().replace(/[\?!.]+$/, "").trim();

  // Helper: clean extracted building name
  function cleanName(s) {
    return s
      .replace(/^(?:the|a|an)\s+/i, "")   // strip articles
      .replace(/^(?:reach|go\s+to|get\s+to|walk\s+to|navigate\s+to)\s+/i, "")  // strip nav verbs
      .trim();
  }

  let origin = null, destination = null;

  // ── Pattern 1: "from X to Y" (most common, most reliable) ───────────────
  let m = q.match(/\bfr(?:om|m)\s+(.+?)\s+(?:to|2)\s+(.+)$/i);
  if (m) {
    origin = cleanName(m[1]);
    destination = cleanName(m[2]);
    return { origin, destination };
  }

  // ── Pattern 2: "take me / guide me from X to Y" ─────────────────────────
  m = q.match(/(?:take\s+me|guide\s+me)\s+(?:from|frm)\s+(.+?)\s+(?:to|2)\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[1]), destination: cleanName(m[2]) };
  }

  // ── Pattern 3: "how to reach Y from X" (dest first, then origin) ────────
  m = q.match(/how\s+to\s+(?:reach|go\s+to|get\s+to|walk\s+to)\s+(.+?)\s+(?:from|frm)\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[2]), destination: cleanName(m[1]) };
  }

  // ── Pattern 4: "path/route/direction/distance to Y from X" ──────────────
  m = q.match(/(?:path|route|direction|distance|way|navigation)\s+(?:to|for)\s+(.+?)\s+(?:from|frm)\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[2]), destination: cleanName(m[1]) };
  }

  // ── Pattern 5: "path/route/direction for X to Y" ────────────────────────
  m = q.match(/(?:path|route|direction|distance|way|navigation)\s+(?:for|of|from)?\s*(.+?)\s+(?:to|2)\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[1]), destination: cleanName(m[2]) };
  }

  // ── Pattern 6: "between X and Y" (use \band\b to avoid matching 'n' inside words!) ─
  m = q.match(/between\s+(.+?)\s+\band\b\s+(.+?)(?:\s+(?:distance|path|route|direction|map|coordinate|walking).*)?$/i);
  if (m) {
    return { origin: cleanName(m[1]), destination: cleanName(m[2]) };
  }

  // ── Pattern 7: "distance/coordinates X and Y" ───────────────────────────
  m = q.match(/(?:distance|coordinates?)\s+(?:between\s+|of\s+|from\s+)?(.+?)\s+\band\b\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[1]), destination: cleanName(m[2]) };
  }

  // ── Pattern 8: "X to Y" (simple, reliable — greedy capture) ─────────────
  // Only if the query also contains a navigation keyword somewhere
  if (/(?:distance|path|route|direction|walk|navigate|reach|map|coordinate|go|get|way)/i.test(q)) {
    m = q.match(/^(?:.*?\b(?:distance|path|route|direction|walk|navigate|reach|map|coordinate|go|get|way)\w*\s+(?:to|for|of|from)?\s*)?(.+?)\s+(?:to|2)\s+(.+)$/i);
    if (m && m[1] && m[2]) {
      const a = cleanName(m[1]);
      const b = cleanName(m[2]);
      // Don't match if either side is just a nav keyword
      if (a.length >= 1 && b.length >= 1 && !/^(?:path|route|distance|direction|how|walk|way)$/i.test(a)) {
        return { origin: a, destination: b };
      }
    }
  }

  // ── Pattern 9: "X se Y" / "X say Y" (Hinglish) ──────────────────────────
  m = q.match(/^(.+?)\s+(?:se|say|sey)\s+(.+)$/i);
  if (m) {
    return { origin: cleanName(m[1]), destination: cleanName(m[2]) };
  }

  // ── Pattern 10: bare "X to Y" (no keywords needed — final fallback) ─────
  // Catches: "admin block to N block", "shastri bhawan to pharmacy"
  m = q.match(/^(.+?)\s+(?:to|2)\s+(.+)$/i);
  if (m) {
    const a = cleanName(m[1]);
    const b = cleanName(m[2]);
    // Only accept if both sides are >= 1 char and neither is a generic verb/question
    if (a.length >= 1 && b.length >= 1 &&
        !/^(?:how|what|where|when|which|who|why|want|need|like|going|trying)$/i.test(a)) {
      return { origin: a, destination: b };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESOLVE ROUTE — given matched origin and destination, find the route
// ═══════════════════════════════════════════════════════════════════════════
async function resolveRoute(originMatch, destMatch, intents, parsedOriginText, parsedDestText) {
  // Build correction note
  let correctionNote = "";
  if (originMatch.correctedFrom && originMatch.correctedFrom.toLowerCase() !== parsedOriginText.toLowerCase()) {
    correctionNote += `\n✏️ _Auto-corrected "${parsedOriginText}" → **${originMatch.name}**_`;
  }
  if (destMatch.correctedFrom && destMatch.correctedFrom.toLowerCase() !== parsedDestText.toLowerCase()) {
    correctionNote += `\n✏️ _Auto-corrected "${parsedDestText}" → **${destMatch.name}**_`;
  }

  // Search CampusRoute DB — try by code FIRST (most reliable)
  let localRoute = null;

  if (originMatch.code && destMatch.code) {
    localRoute = await CampusRoute.findOne({
      $or: [
        { fromCode: originMatch.code, toCode: destMatch.code },
        { fromCode: destMatch.code, toCode: originMatch.code }
      ]
    }).lean();
  }

  // If code search failed, try by name regex
  if (!localRoute) {
    const buildFlexRegex = (name) => {
      const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
      return new RegExp(parts.join('.*'), 'i');
    };
    const originRegex = buildFlexRegex(originMatch.name);
    const destRegex = buildFlexRegex(destMatch.name);

    localRoute = await CampusRoute.findOne({
      $or: [
        { fromName: originRegex, toName: destRegex },
        { fromName: destRegex, toName: originRegex }
      ]
    }).lean();
  }

  if (localRoute) {
    console.log(`[Nav] ✅ Found route in dataset: ${localRoute.pairId} (${localRoute.distanceMeters}m, ${localRoute.walkMinutes}min)`);
    const reply = formatRouteResponse(localRoute, intents, originMatch, destMatch, correctionNote);
    return { reply, source: "dataset" };
  } else {
    console.log("[Nav] Route not in dataset. Using Google Maps fallback.");
    const nav = await resolveDistance(originMatch.name, destMatch.name);
    const mapsOrigin = encodeURIComponent(`${originMatch.name}, Parul University, Vadodara, Gujarat, India`);
    const mapsDest = encodeURIComponent(`${destMatch.name}, Parul University, Vadodara, Gujarat, India`);
    const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${mapsOrigin}&destination=${mapsDest}&travelmode=walking`;

    const reply = `📍 **Campus Navigation**${correctionNote}\n\n**${originMatch.name}** → **${destMatch.name}**\n\n* 📏 **Distance**: ${nav.distance}\n* 🚶‍♂️ **Walk Time**: ${nav.duration}\n* 🗺️ **Source**: ${nav.source}\n\n🗺️ [**View Route on Google Maps →**](${googleMapsLink})\n\nHave a pleasant walk across campus! 🏫`;
    return { reply, source: "map" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATE MATCHED BUILDINGS — check both match, return error if not
// ═══════════════════════════════════════════════════════════════════════════
function buildNotFoundReply(originMatch, destMatch, parsedOrigin, parsedDest) {
  if (!originMatch.matched && !destMatch.matched) {
    return `🚫 Sorry, I couldn't find buildings called **"${parsedOrigin}"** or **"${parsedDest}"** on campus. Please double-check the names.\n\n💡 **Tip**: Use building codes (A1-A24, H1-H33, C1-C3, E1-E5) or names like "Shastri Bhawan", "Engineering Block", "Admin Block", etc.`;
  }
  if (!originMatch.matched) {
    return `🚫 Sorry, there is no building or hostel called **"${parsedOrigin}"** on the Parul University campus. Please check the name and try again.\n\n💡 **Tip**: Use building codes (A1-A24, H1-H33) or common names like "Admin Block", "N Block", "Shastri Bhawan", etc.`;
  }
  if (!destMatch.matched) {
    return `🚫 Sorry, there is no building or hostel called **"${parsedDest}"** on the Parul University campus. Please check the name and try again.\n\n💡 **Tip**: Use building codes (A1-A24, H1-H33) or common names like "Admin Block", "N Block", "Shastri Bhawan", etc.`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED NAVIGATION HANDLER — used by both free and authed endpoints
//  Strategy: LOCAL PARSER FIRST (instant) → Gemini fallback (if local fails)
// ═══════════════════════════════════════════════════════════════════════════
async function handleNavigationQuery(messages, userId) {
  const last = messages[messages.length - 1].content;
  const q = last.toLowerCase();

  // Check for building info queries first ("what is A1?", "tell me about N block")
  const buildingInfo = await handleBuildingInfoQuery(last);
  if (buildingInfo) return buildingInfo;

  // Detect what specific info the user wants
  const intents = detectQueryIntent(last);

  // ── STRATEGY 1: LOCAL REGEX PARSER (instant, no API call) ──────────────
  // Try this FIRST — if the parser can extract two buildings, it IS a nav query
  const localParsed = localParseLocations(last);
  if (localParsed) {
    console.log(`[Nav] Local parser extracted: "${localParsed.origin}" → "${localParsed.destination}"`);

    const originMatch = await fuzzyMatchBuilding(localParsed.origin);
    const destMatch = await fuzzyMatchBuilding(localParsed.destination);
    console.log(`[Nav] Origin match:`, JSON.stringify(originMatch));
    console.log(`[Nav] Dest match:`, JSON.stringify(destMatch));

    // Only treat as navigation if at least one side matched a known building
    if (originMatch.matched || destMatch.matched) {
      const notFoundReply = buildNotFoundReply(originMatch, destMatch, localParsed.origin, localParsed.destination);
      if (notFoundReply) {
        return { reply: notFoundReply, source: "dataset" };
      }
      return await resolveRoute(originMatch, destMatch, intents, localParsed.origin, localParsed.destination);
    }
    // If neither side matched, fall through — it's probably not a nav query
    console.log("[Nav] Local parser found text but no matching buildings. Not a nav query.");
  }

  // ── Keyword-based detection for queries the local parser couldn't handle ──
  const isDistanceQuery = /(distance|how far|how to reach|way from|walking time|route|location between|between.*and|and.*between|path|direction|navigate|walk to|go to|get to|suggest.*way|suggest.*path|suggest.*route|nearest|locate|where is|take me|guide me|show.*way|which way|coordinate|lat|lng|google.*map|map.*link|pin)/i.test(q);

  if (!isDistanceQuery) return null;

  console.log(`[Nav] Navigation keyword detected but local parser couldn't extract: "${last}"`);

  // ── STRATEGY 2: GEMINI AI PARSER (fallback for complex/ambiguous queries) ─
  const recentHistory = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");

  const parsePrompt = `You are a Parul University campus location parser. Extract origin and destination from this conversation.

Known PU building codes and names:
- A1 to A24: Academic blocks (Engineering, Pharmacy, Medical, Management, Design, etc.)
- B1: Central Bank of India
- C1-C3: Central blocks (Student Section, Admission Cell, International Relations)
- E1-E5: Hospitals
- H1-H33: Hostels (Shastri, Kalam, Tagore, Sarojini, Indira, Teresa, etc.)
- Common nicknames: "N block" = Bhagat Singh Bhawan (A24), "NB" = Parul Institute of Technology (A19), "L block" = Subhash Chandra Bose Bhawan (A23), "D block" = PIET D Block (A3), "Admin" = Admission Cell (C2)

IMPORTANT: Handle typos (max 2 char difference). The user's latest message might be a FOLLOW-UP — check earlier messages for context.
Return the names AS CLOSE TO THE USER'S WORDS as possible.

CONVERSATION:
${recentHistory}

RULES:
- Both locations on campus → {"origin":"...","destination":"...","isOnCampus":true}
- Either location off campus → {"origin":null,"destination":null,"isOnCampus":false}
- Cannot determine → {"origin":null,"destination":null,"isOnCampus":null}
- No markdown, just raw JSON.`;

  try {
    const parsed = JSON.parse(
      (await chatCompletion([{ role: "user", content: parsePrompt }], "Respond only with valid JSON."))
        .replace(/```json/g, "").replace(/```/g, "").trim()
    );

    if (parsed?.isOnCampus === true && parsed.origin && parsed.destination) {
      console.log(`[Nav] Gemini parsed: "${parsed.origin}" → "${parsed.destination}"`);

      const originMatch = await fuzzyMatchBuilding(parsed.origin);
      const destMatch = await fuzzyMatchBuilding(parsed.destination);

      const notFoundReply = buildNotFoundReply(originMatch, destMatch, parsed.origin, parsed.destination);
      if (notFoundReply) {
        return { reply: notFoundReply, source: "dataset" };
      }

      return await resolveRoute(originMatch, destMatch, intents, parsed.origin, parsed.destination);

    } else if (parsed?.isOnCampus === false) {
      return {
        reply: "🚫 I can only provide navigation for locations **within the Parul University campus**. Please ask about campus buildings, hostels, or facilities!",
        source: "map"
      };
    }
    return null;
  } catch (parseError) {
    console.error("[Nav] Gemini parsing also failed:", parseError.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  FUZZY TEXT SEARCH FOR FAQ / DATASHEET
// ═══════════════════════════════════════════════════════════════════════════
function buildFuzzyTokens(query) {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3);
}

function scoreChunk(chunkAnswer, searchTokens) {
  const lower = chunkAnswer.toLowerCase();
  let score = 0;
  for (const token of searchTokens) {
    if (lower.includes(token)) {
      score += 3;
    } else {
      for (let i = 0; i < token.length; i++) {
        const fuzzy = token.slice(0, i) + token.slice(i + 1);
        if (fuzzy.length >= 3 && lower.includes(fuzzy)) {
          score += 1;
          break;
        }
      }
    }
  }
  return score;
}

async function searchPublicData(query, limit = 5) {
  const publicFaqs = await Faq.find({ isPublic: true }).lean();
  const tokens = buildFuzzyTokens(query);
  if (tokens.length === 0) return [];

  const scored = publicFaqs
    .map(f => ({ ...f, score: scoreChunk(f.answer + ' ' + f.question, tokens) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// ═══════════════════════════════════════════════════════════════════════════
//  FREE MODE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

const freeSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(2000)
    })
  ).min(1).max(20),
});

router.post("/free", async (req, res) => {
  try {
    const data = freeSchema.parse(req.body);
    const lastMessage = data.messages[data.messages.length - 1].content;

    // 1) Navigation / building info — works WITHOUT AI!
    const navResult = await handleNavigationQuery(data.messages, null);
    if (navResult) {
      const upsell = "\n\n---\n💡 _Sign in with your @paruluniversity.ac.in email for full AI-powered answers!_";
      return res.json({ reply: navResult.reply + upsell, source: navResult.source });
    }

    // 2) FAQ search
    const recentUserMsgs = data.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(" ");

    const relevantChunks = await searchPublicData(recentUserMsgs, 5);

    if (relevantChunks.length > 0) {
      const context = relevantChunks.map(c => c.answer).join("\n\n---\n\n");
      const sysPrompt = `You are Knoq-AI, the official AI helpdesk for Parul University (free mode). Answer ONLY using the SOURCES below. Be concise (2-4 sentences), accurate, and helpful. If the user has typos, understand what they meant. If the sources don't cover the question, say "I have limited info in free mode — sign in with your @paruluniversity.ac.in email for full AI access."

SOURCES:
${context}`;

      try {
        const reply = await chatCompletion(data.messages, sysPrompt);
        return res.json({ reply, source: "ai (public data)" });
      } catch (aiErr) {
        console.error("[Free Chat] AI error:", aiErr.message);
        // Serve FAQ data directly when AI is down
        const bestMatch = relevantChunks[0];
        const directReply = `📋 **Here's what I found:**\n\n${bestMatch.question ? `**Q:** ${bestMatch.question}\n\n` : ""}**A:** ${bestMatch.answer}\n\n---\n⚠️ _AI rephrasing is temporarily unavailable. Showing raw FAQ data. Sign in for the full experience!_`;
        return res.json({ reply: directReply, source: "faq (direct)" });
      }
    }

    return res.json({
      reply: "I couldn't find specific information for that query in free mode. Sign in with your @paruluniversity.ac.in email to get full AI-powered answers with access to the complete knowledge base!",
      source: "fallback",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("[Free Chat] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  AUTHED MODE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

const authedSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(2000)
    })
  ).min(1).max(20),
});

router.post("/authed", requireAuth, async (req, res) => {
  try {
    const data = authedSchema.parse(req.body);
    const user = req.user;
    const last = data.messages[data.messages.length - 1].content;
    const q = last.toLowerCase();

    let reply;
    let source;
    let matchedSources = [];

    // 1) Semantic Cache
    const cachedReply = await getSemanticCachedResponse(last);
    if (cachedReply) {
      await ChatLog.create({ userId: user._id, question: last, answer: cachedReply, source: "cache" }).catch(() => {});
      return res.json({ reply: cachedReply, source: "cache" });
    }

    // 2) Navigation / Building Info — shared handler
    const navResult = await handleNavigationQuery(data.messages, user._id);
    if (navResult) {
      saveToSemanticCache(last, navResult.reply).catch(() => {});
      await ChatLog.create({ userId: user._id, question: last, answer: navResult.reply, source: navResult.source }).catch(() => {});
      return res.json({ reply: navResult.reply, source: navResult.source });
    }

    // 3) Datasheet + FAQ fuzzy search
    const recentUserMsgs = data.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(" ");

    const datasheetHits = await searchPublicData(recentUserMsgs, 4);

    const allFaqs = await Faq.find({ isPublic: { $ne: true } }, "question answer keywords").lean();
    const faqHit = allFaqs.find(f => f.keywords?.some(kw => q.includes(kw.toLowerCase())));

    // 4) RAG search
    const matches = await ragSearch(last, 3);
    const isBrochure = matches.some(m => m.url?.startsWith("brochure://"));

    // 5) Combined context
    let contextBlocks = [];

    if (datasheetHits.length > 0) {
      datasheetHits.forEach((hit, i) => {
        contextBlocks.push(`[Datasheet ${i + 1}] ${hit.answer}`);
      });
    }
    if (faqHit) {
      contextBlocks.push(`[FAQ] Q: ${faqHit.question}\nA: ${faqHit.answer}`);
    }
    matches.forEach((m, i) => {
      if (m.pageNumber) {
        contextBlocks.push(`[Source ${i + 1}] Brochure: ${m.pdfName}, Page: ${m.pageNumber}\n${m.markdown.substring(0, 2000)}`);
      } else {
        contextBlocks.push(`[Source ${i + 1}] ${m.title || m.url}\n${m.markdown.substring(0, 2000)}`);
      }
    });

    const allContext = contextBlocks.join("\n\n---\n\n");

    // Student profile
    const prefLines = [];
    if (user.fullName) prefLines.push(`Name: ${user.fullName}`);
    if (user.branch) prefLines.push(`Program / Branch: ${user.branch}`);
    if (user.semester) prefLines.push(`Current semester: ${user.semester}`);
    if (user.hostel) prefLines.push(`Hostel block: ${user.hostel}`);

    const studentBlock = prefLines.length
      ? `\n\nSTUDENT PROFILE:\n${prefLines.join("\n")}`
      : "";

    let sys;
    if (isBrochure) {
      sys = `You are Knoq-AI, the official AI helpdesk for Parul University. Answer using the brochure and datasheet sources below. Cite page numbers as [Page X]. Be concise (3-6 sentences), warm, factual. Handle typos gracefully — if the user wrote "btech" they mean "B.Tech", "hostle" means "hostel", "CSE" means "Computer Science & Engineering", etc.${studentBlock}

SOURCES:
${allContext || "(no data available)"}`;
    } else {
      sys = `You are Knoq-AI, the official AI helpdesk for Parul University. Answer using the SOURCES below. Be concise (3-6 sentences), warm, factual. Cite [Datasheet N] or [Source N] when using specific data. Handle typos gracefully — "btech" = "B.Tech", "hostle" = "hostel", "CSE" = "Computer Science & Engineering", etc. If sources don't cover the question, answer from general PU knowledge and note "(general info)".${studentBlock}

SOURCES:
${allContext || "(no indexed data — answer from general knowledge of Parul University)"}`;
    }

    try {
      reply = await chatCompletion(data.messages, sys);
      source = isBrochure ? "brochure" : (datasheetHits.length > 0 ? "datasheet" : "ai");
      saveToSemanticCache(last, reply).catch(() => {});
    } catch (err) {
      console.error("[Authed Chat] AI error:", err.message);
      // Serve whatever data we have directly when AI is down
      if (faqHit) {
        reply = `📋 **Here's what I found:**\n\n**Q:** ${faqHit.question}\n\n**A:** ${faqHit.answer}\n\n---\n⚠️ _AI rephrasing is temporarily unavailable. Showing raw FAQ data._`;
        source = "faq (direct)";
      } else if (datasheetHits.length > 0) {
        const topHit = datasheetHits[0];
        reply = `📋 **Here's what I found:**\n\n${topHit.question ? `**Q:** ${topHit.question}\n\n` : ""}**A:** ${topHit.answer}\n\n---\n⚠️ _AI rephrasing is temporarily unavailable. Showing raw data._`;
        source = "datasheet (direct)";
      } else if (matches.length > 0) {
        const topMatch = matches[0];
        reply = `📋 **Here's what I found:**\n\n${topMatch.markdown?.substring(0, 1000) || "(Content available but needs AI to summarize)"}\n\n---\n⚠️ _AI service is temporarily unavailable. Please try again shortly._`;
        source = "rag (direct)";
      } else {
        reply = "⚠️ The AI service is temporarily unavailable and I couldn't find a direct answer in our FAQ database. Please try again in a few minutes, or ask about campus navigation — that works without AI!";
        source = "error";
      }
    }

    await ChatLog.create({ userId: user._id, question: last, answer: reply, source }).catch(() => {});

    matchedSources = matches.map(m => ({
      title: m.title,
      url: m.url,
      pageNumber: m.pageNumber,
      pdfName: m.pdfName
    }));

    return res.json({ reply, source, sources: matchedSources });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Chat authed error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT HISTORY
// ═══════════════════════════════════════════════════════════════════════════
router.get("/history", requireAuth, async (req, res) => {
  try {
    const logs = await ChatLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ logs });
  } catch (error) {
    console.error("Fetch chat history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
