
const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, 'Cash_Tracker_With_Warning.xlsx');
try {
    const workbook = XLSX.readFile(file);
    console.log('Sheet names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        console.log('\n=== Sheet:', sheetName, '===');
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Data:', data.slice(0, 10)); // First 10 rows
    });
} catch (e) {
    console.error('Error reading Excel file:', e);
}
