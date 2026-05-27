import 'dotenv/config';
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import fs from 'fs';
import csv from 'csv-parser';
import Faq from '../models/Faq.js';
import CampusRoute from '../models/CampusRoute.js';

const excelFile = 'c:\\DHRUV MAJI\\AI-ML Project\\future-vision-hub\\Parul_University_Complete_Datasheet_2026-27.xlsx';
const csvFile = 'c:\\DHRUV MAJI\\AI-ML Project\\future-vision-hub\\PU_Campus_Navigation_Dataset_v3_verified.csv';

/**
 * Read an Excel sheet, detect the header row (first row where __EMPTY columns
 * appear), remap column names to human-readable headers, then chunk the
 * remaining data rows into FAQ entries with clean, searchable text.
 */
function parseSheetIntelligent(workbook, sheetName) {
  const raw = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  if (raw.length === 0) return [];

  // The first column key is the sheet title (e.g. "PARUL UNIVERSITY – COMPLETE PROGRAMME FEES ...")
  const titleKey = Object.keys(raw[0])[0];

  // Find the header row – it is the first row where the titleKey value looks
  // like a column heading (short text, usually contains "/" or "No" or "Name")
  // In the data the header row has values in __EMPTY, __EMPTY_1, etc.
  let headerRowIdx = -1;
  let headers = {};

  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const row = raw[i];
    const keys = Object.keys(row);
    if (keys.length >= 2 && keys.some(k => k.startsWith('__EMPTY'))) {
      // This looks like a header row
      headerRowIdx = i;
      headers[titleKey] = String(row[titleKey] || '');
      keys.filter(k => k.startsWith('__EMPTY')).forEach(k => {
        headers[k] = String(row[k] || '');
      });
      break;
    }
  }

  // If we didn't find column headers (e.g. single-column sheets like Overview),
  // just use the raw text
  if (headerRowIdx === -1) {
    // Single-column sheet — just join all rows into one big text block
    const allText = raw.map(r => Object.values(r).join(' | ')).join('\n');
    return [{
      question: `Parul University - ${sheetName}`,
      answer: `Source: ${sheetName}\n${allText}`.substring(0, 3000),
      keywords: extractKeywords(sheetName, allText),
      category: categorizeSheet(sheetName),
      isPublic: true
    }];
  }

  // Data rows start after the header
  const dataRows = raw.slice(headerRowIdx + 1);
  const colKeys = Object.keys(headers); // [titleKey, __EMPTY, __EMPTY_1, ...]
  const colNames = colKeys.map(k => headers[k]); // human-readable names

  // Build clean text rows
  const faqEntries = [];
  const chunkSize = 3; // fewer rows per chunk = more precise answers

  for (let i = 0; i < dataRows.length; i += chunkSize) {
    const chunk = dataRows.slice(i, i + chunkSize);

    // Build human-readable table text
    let text = `Source: Parul University ${sheetName}\n`;
    text += `Columns: ${colNames.join(' | ')}\n\n`;

    chunk.forEach(row => {
      const vals = colKeys.map(k => String(row[k] || '-'));
      // Create a labeled row
      const labeled = colNames.map((name, idx) => `${name}: ${vals[idx]}`).join(' | ');
      text += labeled + '\n';
    });

    // Extract meaningful keywords from the chunk text for search
    const firstVal = String(chunk[0]?.[colKeys[1]] || chunk[0]?.[titleKey] || '');

    faqEntries.push({
      question: `${sheetName} - ${firstVal}`.substring(0, 300),
      answer: text.substring(0, 3000),
      keywords: extractKeywords(sheetName, text),
      category: categorizeSheet(sheetName),
      isPublic: true
    });
  }

  return faqEntries;
}

function categorizeSheet(name) {
  const n = name.toLowerCase();
  if (n.includes('fee')) return 'fees';
  if (n.includes('hostel')) return 'hostel';
  if (n.includes('placement')) return 'placement';
  if (n.includes('ranking')) return 'rankings';
  if (n.includes('lateral')) return 'admissions';
  if (n.includes('pathway')) return 'pathway';
  if (n.includes('dual')) return 'academics';
  if (n.includes('contact') || n.includes('office')) return 'contact';
  return 'general';
}

function extractKeywords(sheetName, text) {
  const keywords = new Set();

  // Always add sheet-related keywords
  const sheetWords = sheetName.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/);
  sheetWords.forEach(w => { if (w.length >= 3) keywords.add(w); });

  // Extract programme names, hostel names, company names etc from the text
  const importantWords = text.toLowerCase()
    .replace(/[^\w\s.,-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !['source', 'parul', 'university', 'complete', 'programme', 'campus', 'notes', 'annual'].includes(w));
  
  // Pick top frequent meaningful words
  const freq = {};
  importantWords.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([w]) => keywords.add(w));

  // Always include these base terms
  keywords.add('datasheet');
  keywords.add('public');
  
  return [...keywords].slice(0, 12);
}

async function ingestExcel() {
  console.log('Ingesting Excel data into FAQs (isPublic=true)...');
  const workbook = xlsx.readFile(excelFile);
  let faqsToAdd = [];

  workbook.SheetNames.forEach(sheetName => {
    const entries = parseSheetIntelligent(workbook, sheetName);
    console.log(`  Sheet "${sheetName}": ${entries.length} chunks`);
    faqsToAdd.push(...entries);
  });

  // Delete existing public datasheet FAQs to prevent duplicates
  await Faq.deleteMany({ category: { $in: ['datasheet', 'fees', 'hostel', 'placement', 'rankings', 'admissions', 'pathway', 'academics', 'contact', 'general'] }, isPublic: true });
  await Faq.insertMany(faqsToAdd);
  console.log(`Successfully added ${faqsToAdd.length} public datasheet chunks to Faq.`);
}

async function ingestCSV() {
  console.log('Ingesting CSV data into CampusRoute...');
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          pairId: data.pair_id,
          fromCode: data.from_code,
          fromName: data.from_name,
          toCode: data.to_code,
          toName: data.to_name,
          directionNatural: data.direction_natural,
          directionCardinal: data.direction_cardinal,
          distanceMeters: parseInt(data.gps_distance_meters) || 0,
          walkMinutes: parseInt(data.est_walk_minutes) || 0,
          googleMapsUrl: data.google_maps_url,
          batch: data.batch
        });
      })
      .on('end', async () => {
        try {
          await CampusRoute.deleteMany({});
          
          const chunkSize = 1000;
          for (let i = 0; i < results.length; i += chunkSize) {
            const chunk = results.slice(i, i + chunkSize);
            await CampusRoute.insertMany(chunk);
            console.log(`Inserted chunk ${i} to ${i + chunk.length}`);
          }
          console.log(`Successfully ingested ${results.length} campus routes.`);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');
    await ingestExcel();
    await ingestCSV();
    console.log('Ingestion complete.');
  } catch (err) {
    console.error('Ingestion error:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
