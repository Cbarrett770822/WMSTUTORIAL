// Script to check the contents of an Excel file
require('dotenv').config();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Function to find Excel files in a directory
function findExcelFiles(directory) {
  try {
    const files = fs.readdirSync(directory);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.xlsx' || ext === '.xls';
    });
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

// Function to check Excel file contents
function checkExcelFile(filePath) {
  try {
    console.log(`Checking Excel file: ${filePath}`);
    
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
    
    // Display the presentations
    presentations.forEach((presentation, index) => {
      console.log(`\nPresentation #${index + 1}:`);
      console.log(`ID: ${presentation.id || 'Not specified'}`);
      console.log(`Title: ${presentation.title || 'Not specified'}`);
      console.log(`URL: ${presentation.url || 'Not specified'}`);
      
      // Check if URL is an example.com URL
      if (presentation.url && presentation.url.includes('example.com')) {
        console.log('⚠️ WARNING: This is an example.com URL that needs to be updated');
      }
    });
    
    // Count how many example.com URLs are in the file
    const exampleUrls = presentations.filter(p => p.url && p.url.includes('example.com'));
    if (exampleUrls.length > 0) {
      console.log(`\n⚠️ Found ${exampleUrls.length} example.com URLs that need to be updated`);
    } else {
      console.log('\n✅ No example.com URLs found in this Excel file');
    }
  } catch (error) {
    console.error(`Error checking Excel file ${filePath}:`, error);
  }
}

// Main function
async function main() {
  // Check for Excel files in the current directory
  const currentDir = process.cwd();
  console.log(`Looking for Excel files in ${currentDir}`);
  
  const excelFiles = findExcelFiles(currentDir);
  
  if (excelFiles.length === 0) {
    console.log('No Excel files found in the current directory');
    return;
  }
  
  console.log(`Found ${excelFiles.length} Excel files: ${excelFiles.join(', ')}`);
  
  // Check each Excel file
  for (const file of excelFiles) {
    const filePath = path.join(currentDir, file);
    checkExcelFile(filePath);
    console.log('\n-----------------------------------\n');
  }
}

// Run the script
main().catch(error => {
  console.error('Error running script:', error);
});
