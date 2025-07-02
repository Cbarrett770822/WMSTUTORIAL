require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Process = require('../netlify/functions/models/Process');
const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

// Path to Excel file
const excelPath = process.argv[2] || 'c:/Users/Admin/Downloads/wms_processes_template.xlsx';

async function verifyExcelImport() {
  try {
    console.log(`\n===== EXCEL IMPORT VERIFICATION TOOL =====`);
    console.log(`Using Excel file path: ${excelPath}`);
    
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
    // Read Excel file
    console.log(`\nReading Excel file from: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    console.log(`Excel file read successfully with sheets: ${workbook.SheetNames.join(', ')}`);
    
    if (!workbook.Sheets['Processes'] || !workbook.Sheets['Steps']) {
      throw new Error('Required sheets not found in Excel file');
    }
    
    // Convert sheets to JSON
    const processesData = xlsx.utils.sheet_to_json(workbook.Sheets['Processes']);
    const stepsData = xlsx.utils.sheet_to_json(workbook.Sheets['Steps']);
    console.log(`Found ${processesData.length} processes and ${stepsData.length} steps in Excel`);
    
    // Get database processes
    const dbProcesses = await Process.find({}).lean();
    console.log(`Found ${dbProcesses.length} processes in database`);
    
    // Compare counts
    const processCountMatch = processesData.length === dbProcesses.length;
    console.log(`\n${processCountMatch ? '✅' : '❌'} Process count ${processCountMatch ? 'matches' : 'differs'}: ${processesData.length} in Excel vs ${dbProcesses.length} in DB`);
    
    // Create maps for easier comparison
    const excelProcessMap = new Map();
    processesData.forEach(p => excelProcessMap.set(p.id, p));
    
    const dbProcessMap = new Map();
    dbProcesses.forEach(p => dbProcessMap.set(p.id, p));
    
    // Check for process ID preservation
    console.log('\n===== PROCESS ID PRESERVATION CHECK =====');
    let processIdMatches = 0;
    let processIdMismatches = 0;
    
    for (const excelProcess of processesData) {
      const dbProcess = dbProcesses.find(p => p.id === excelProcess.id);
      if (dbProcess) {
        console.log(`✅ Process ID preserved: ${excelProcess.id} (${excelProcess.title || excelProcess.name || 'Unnamed'})`);
        processIdMatches++;
      } else {
        console.log(`❌ Process ID not found in DB: ${excelProcess.id} (${excelProcess.title || excelProcess.name || 'Unnamed'})`);
        processIdMismatches++;
      }
    }
    
    // Check if any DB processes aren't in Excel
    for (const dbProcess of dbProcesses) {
      if (!excelProcessMap.has(dbProcess.id)) {
        console.log(`❓ DB process not in Excel: ${dbProcess.id} (${dbProcess.title || dbProcess.name || 'Unnamed'})`);
        processIdMismatches++;
      }
    }
    
    console.log(`\nProcess ID match rate: ${processIdMatches}/${processesData.length} (${Math.round(processIdMatches/processesData.length*100)}%)`);
    
    // Check step preservation and video URLs
    console.log('\n===== STEP DATA PRESERVATION CHECK =====');
    let totalStepsInDb = 0;
    let stepIdMatches = 0;
    let stepIdMismatches = 0;
    let videoUrlMatches = 0;
    let videoUrlMismatches = 0;
    
    // Create a map of steps by their IDs for easier lookup
    const excelStepMap = new Map();
    stepsData.forEach(step => excelStepMap.set(step.id, step));
    
    // Check each process's steps
    for (const dbProcess of dbProcesses) {
      if (!dbProcess.steps || dbProcess.steps.length === 0) {
        console.log(`⚠️ No steps found for process ${dbProcess.id} (${dbProcess.title || dbProcess.name || 'Unnamed'})`);
        continue;
      }
      
      totalStepsInDb += dbProcess.steps.length;
      
      // Check each step in this process
      for (const dbStep of dbProcess.steps) {
        const excelStep = excelStepMap.get(dbStep.id);
        
        if (excelStep) {
          stepIdMatches++;
          
          // Compare video URLs
          const excelVideoUrl = excelStep.videoUrl || '';
          const dbVideoUrl = dbStep.videoUrl || '';
          
          if (excelVideoUrl === dbVideoUrl) {
            videoUrlMatches++;
          } else {
            videoUrlMismatches++;
            console.log(`❌ Video URL mismatch for step ${dbStep.id} (${dbStep.title || 'Unnamed'}):`);
            console.log(`   Excel: ${excelVideoUrl}`);
            console.log(`   DB:    ${dbVideoUrl}`);
          }
        } else {
          stepIdMismatches++;
          console.log(`❌ Step ID in DB not found in Excel: ${dbStep.id} (${dbStep.title || 'Unnamed'})`);
        }
      }
    }
    
    // Check if any Excel steps are missing from DB
    const dbStepIds = new Set();
    dbProcesses.forEach(p => {
      if (p.steps) {
        p.steps.forEach(s => dbStepIds.add(s.id));
      }
    });
    
    let excelStepsMissingFromDb = 0;
    stepsData.forEach(step => {
      if (!dbStepIds.has(step.id)) {
        excelStepsMissingFromDb++;
        console.log(`❌ Step in Excel missing from DB: ${step.id} (${step.title || 'Unnamed'})`);
      }
    });
    
    // Summary
    console.log('\n===== VERIFICATION SUMMARY =====');
    console.log(`Total processes in Excel: ${processesData.length}`);
    console.log(`Total processes in Database: ${dbProcesses.length}`);
    console.log(`Process ID matches: ${processIdMatches} out of ${processesData.length} (${Math.round(processIdMatches/processesData.length*100)}%)`);
    console.log(`Total steps in Excel: ${stepsData.length}`);
    console.log(`Total steps in Database: ${totalStepsInDb}`);
    console.log(`Step ID matches: ${stepIdMatches} out of ${totalStepsInDb} (${Math.round(stepIdMatches/totalStepsInDb*100)}%)`);
    console.log(`Video URL matches: ${videoUrlMatches} out of ${stepIdMatches} matched steps (${Math.round(videoUrlMatches/stepIdMatches*100)}%)`);
    
    if (processIdMatches === processesData.length && stepIdMatches === totalStepsInDb && videoUrlMatches === stepIdMatches) {
      console.log('\n✅ SUCCESS! All processes and steps are preserved correctly with matching video URLs.');
    } else {
      console.log('\n⚠️ ISSUES DETECTED: Some data did not match between Excel and database.');
    }
    
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the verification
verifyExcelImport();
