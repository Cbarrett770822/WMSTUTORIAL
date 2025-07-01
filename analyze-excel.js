// Script to analyze an Excel file
require('dotenv').config();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Function to analyze Excel file contents
function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    
    // Get all sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
    
    // Look for a Presentations sheet
    const presentationsSheetName = sheetNames.find(name => 
      name.toLowerCase() === 'presentations');
    
    if (!presentationsSheetName) {
      console.log('No Presentations sheet found in this Excel file');
      return;
    }
    
    // Parse the Presentations sheet
    const presentationsSheet = workbook.Sheets[presentationsSheetName];
    const presentations = xlsx.utils.sheet_to_json(presentationsSheet);
    
    console.log(`Found ${presentations.length} presentations in the Excel file`);
    
    // Get column headers
    const headers = Object.keys(presentations[0] || {});
    console.log('\nColumn headers in the Excel file:');
    console.log(headers);
    
    // Check if URL column exists
    if (headers.includes('url')) {
      console.log('\n✅ URL column found in the Excel file');
    } else {
      console.log('\n❌ URL column NOT found in the Excel file - this will cause validation errors');
    }
    
    // Display the presentations
    presentations.forEach((presentation, index) => {
      console.log(`\nPresentation #${index + 1}:`);
      Object.entries(presentation).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      
      // Check if URL is missing or empty
      if (!presentation.url) {
        console.log('⚠️ WARNING: This presentation has no URL');
      }
    });
    
    // Count how many presentations are missing URLs
    const missingUrls = presentations.filter(p => !p.url);
    if (missingUrls.length > 0) {
      console.log(`\n⚠️ Found ${missingUrls.length} presentations missing URLs`);
    } else {
      console.log('\n✅ All presentations have URLs');
    }
    
    return {
      sheetNames,
      headers,
      presentations,
      missingUrls: missingUrls.length
    };
  } catch (error) {
    console.error(`Error analyzing Excel file ${filePath}:`, error);
    return null;
  }
}

// Main function
async function main() {
  // Check for the Excel file in the downloads directory
  const downloadsDir = path.join('C:', 'Users', 'Admin', 'Downloads');
  const excelFileName = 'wms_presentations_template.xlsx';
  const excelFilePath = path.join(downloadsDir, excelFileName);
  
  console.log(`Looking for Excel file: ${excelFilePath}`);
  
  if (!fs.existsSync(excelFilePath)) {
    console.log(`Excel file not found at ${excelFilePath}`);
    return;
  }
  
  console.log(`Excel file found at ${excelFilePath}`);
  
  // Analyze the Excel file
  analyzeExcelFile(excelFilePath);
}

// Run the script
main().catch(error => {
  console.error('Error running script:', error);
});
