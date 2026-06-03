const xlsx = require('xlsx');
const fs = require('fs');
const csv = require('csv-parser');

const excelFile = 'c:\\DHRUV MAJI\\AI-ML Project\\future-vision-hub\\Parul_University_Complete_Datasheet_2026-27.xlsx';
const csvFile = 'c:\\DHRUV MAJI\\AI-ML Project\\future-vision-hub\\PU_Campus_Navigation_Dataset_v3_verified.csv';

console.log('--- EXCEL FILE ---');
try {
  const workbook = xlsx.readFile(excelFile);
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\nSheet: ${sheetName}`);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]).slice(0, 5);
    console.log(JSON.stringify(data, null, 2));
  });
} catch (e) {
  console.log('Error reading excel:', e.message);
}

console.log('\n--- CSV FILE ---');
try {
  const results = [];
  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log(JSON.stringify(results.slice(0, 5), null, 2));
      console.log(`Total CSV rows: ${results.length}`);
    });
} catch (e) {
  console.log('Error reading csv:', e.message);
}