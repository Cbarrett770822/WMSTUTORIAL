require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Process = require('../netlify/functions/models/Process');

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

// Path to Excel file
const excelPath = 'c:/Users/Admin/Downloads/wms_processes_template.xlsx';

async function importExcel() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
    // Read Excel file
    console.log(`Reading Excel file from: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    
    if (!workbook.Sheets['Processes'] || !workbook.Sheets['Steps']) {
      throw new Error('Required sheets not found in Excel file');
    }
    
    // Convert sheets to JSON
    const processesData = xlsx.utils.sheet_to_json(workbook.Sheets['Processes']);
    const stepsData = xlsx.utils.sheet_to_json(workbook.Sheets['Steps']);
    
    console.log(`Found ${processesData.length} processes and ${stepsData.length} steps in Excel`);
    
    // Perform validations
    console.log('Performing validations...');
    
    // Check if all processes have an ID
    const processesWithoutId = processesData.filter(process => !process.id);
    if (processesWithoutId.length > 0) {
      throw new Error(`Validation failed: ${processesWithoutId.length} processes are missing ID fields`);
    }
    
    // Check if all steps have a processId
    const stepsWithoutProcessId = stepsData.filter(step => !step.processId);
    if (stepsWithoutProcessId.length > 0) {
      throw new Error(`Validation failed: ${stepsWithoutProcessId.length} steps are missing processId fields`);
    }
    
    // Check if all step processIds match existing process IDs
    const processIdSet = new Set(processesData.map(process => process.id));
    const orphanedSteps = stepsData.filter(step => !processIdSet.has(step.processId));
    if (orphanedSteps.length > 0) {
      throw new Error(`Validation failed: ${orphanedSteps.length} steps reference non-existent process IDs`);
    }
    
    console.log('All validations passed. Proceeding with import...');
    
    // Create normalized processes
    const normalizedProcesses = processesData.map(process => {
      // Find steps for this process
      const processSteps = stepsData
        .filter(step => step.processId === process.id)
        .map(step => ({
          id: step.id, // Preserve original step ID
          title: step.title || '',
          description: step.description || '',
          videoUrl: step.videoUrl || ''
        }));
      
      // Create process object with original ID
      return {
        id: process.id, // Preserve original process ID
        title: process.title || process.name || '',
        name: process.name || process.title || '',
        description: process.description || '',
        category: process.category || 'general',
        steps: processSteps
      };
    });
    
    console.log(`Normalized ${normalizedProcesses.length} processes with their steps`);
    
    // Delete existing processes
    console.log('Deleting existing processes...');
    const beforeCount = await Process.countDocuments({});
    console.log(`Found ${beforeCount} existing processes before deletion`);
    
    // Perform deletion
    const deleteResult = await Process.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} processes`);
    
    // Verify deletion
    const afterDeleteCount = await Process.countDocuments({});
    if (afterDeleteCount > 0) {
      throw new Error(`Failed to delete all processes. ${afterDeleteCount} remain.`);
    }
    console.log('Confirmed all processes were deleted');
    
    // Insert new processes
    console.log(`Inserting ${normalizedProcesses.length} new processes...`);
    const insertResult = await Process.insertMany(normalizedProcesses);
    console.log(`Successfully inserted ${insertResult.length} processes`);
    
    // Verify insertion
    const finalCount = await Process.countDocuments({});
    console.log(`Final process count: ${finalCount}`);
    
    // Print some sample data to verify
    const sampleProcesses = await Process.find({}).limit(3).lean();
    console.log('\nSample processes after import:');
    sampleProcesses.forEach(process => {
      console.log(`ID: ${process.id}, Title: ${process.title}, Steps: ${process.steps.length}`);
      if (process.steps && process.steps.length > 0) {
        console.log(`Sample Step ID: ${process.steps[0].id}, Video URL: ${process.steps[0].videoUrl}`);
      }
    });
    
    console.log('\nImport completed successfully');
    
  } catch (error) {
    console.error('Error importing Excel:', error);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the import
importExcel();
