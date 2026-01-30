import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      // Normalize all headers to lowercase
      row[header.toLowerCase().trim()] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}

// Debug function
function debugRow(row, source) {
  console.log(`[${source}] Sample:`, JSON.stringify(row, null, 2));
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Process Chase OpenTable data
const chaseContent = fs.readFileSync(
  path.join(__dirname, '../scraper/chase_opentable_database.csv'),
  'utf-8'
);
const chaseData = parseCSV(chaseContent).map(row => ({
  name: row.name || row.google_name,
  address: row.address,
  city: row.city,
  cuisine: row.cuisine || null,
  neighborhood: row.neighborhood || null,
  website: row.website,
  bookingUrl: row.opentableurl || '',
  lat: parseFloat(row.lat),
  lon: parseFloat(row.lon),
  program: 'chase'
})).filter(r => r.lat && r.lon && !isNaN(r.lat) && !isNaN(r.lon) && r.name);

// Process Amex Resy data
const amexContent = fs.readFileSync(
  path.join(__dirname, '../scraper/amex_resy_database.csv'),
  'utf-8'
);
const amexData = parseCSV(amexContent).map(row => ({
  name: row.name || row.google_name,
  address: row.address,
  city: row.city,
  state: row.state || null,
  website: row.website,
  bookingUrl: row.resy_link || '',
  lat: parseFloat(row.lat),
  lon: parseFloat(row.lon),
  program: 'amex'
})).filter(r => r.lat && r.lon && !isNaN(r.lat) && !isNaN(r.lon));

// Combine all data
const allData = [...chaseData, ...amexData];

// Write individual files
fs.writeFileSync(
  path.join(__dirname, '../public/data/chase.json'),
  JSON.stringify(chaseData, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../public/data/amex.json'),
  JSON.stringify(amexData, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../public/data/restaurants.json'),
  JSON.stringify(allData, null, 2)
);

console.log(`✓ Chase OpenTable: ${chaseData.length} restaurants`);
console.log(`✓ Amex Resy: ${amexData.length} restaurants`);
console.log(`✓ Total: ${allData.length} restaurants`);
console.log('\nFiles written to public/data/');
