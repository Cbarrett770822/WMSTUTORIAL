const withCors = require('./middleware/withCors');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const { ObjectId } = require('mongodb');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Process = require('./models/Process');
const Presentation = require('./models/Presentation');

// Helper function to detect source type from URL
function detectSourceType(url) {
  if (!url) return 'other';
  
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('s3.amazonaws.com')) return 's3';
  if (lowerUrl.includes('dropbox.com')) return 'dropbox';
  if (lowerUrl.includes('drive.google.com')) return 'gdrive';
  if (lowerUrl.includes('docs.google.com/presentation')) return 'gslides';
  if (lowerUrl.includes('onedrive.live.com') || lowerUrl.includes('sharepoint.com')) return 'onedrive';
  return 'other';
}

// Helper function to generate direct URL based on source type
function generateDirectUrl(url, sourceType) {
  if (!url) return url;
  
  let directUrl = url;
  
  switch (sourceType) {
    case 'dropbox':
      // Convert dropbox.com/s/ links to dropbox.com/s/dl/ links
      directUrl = directUrl.replace('www.dropbox.com/s/', 'www.dropbox.com/s/dl/');
      // Remove query parameters
      directUrl = directUrl.split('?')[0];
      break;
      
    case 'gdrive':
      // Extract file ID and create direct download link
      const fileIdMatch = directUrl.match(/\/file\/d\/([^\/]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      break;
      
    case 'gslides':
      // Extract presentation ID and create export link
      const presentationIdMatch = directUrl.match(/\/presentation\/d\/([^\/]+)/);
      if (presentationIdMatch && presentationIdMatch[1]) {
        const presentationId = presentationIdMatch[1];
        directUrl = `https://docs.google.com/presentation/d/${presentationId}/export/pptx`;
      }
      break;
  }
  
  return directUrl;
}

// Debug mode for detailed logging
const DEBUG = process.env.DEBUG_EXCEL_UPLOAD === 'true' || true;

// Log the process ID mapping to help with debugging
const logProcessIdMapping = (excelId, dbId) => {
  console.log(`Process ID mapping: Excel ID=${excelId} -> DB ID=${dbId}`);
};

/**
 * Generate a consistent ID for processes
 * This ensures that processes from Excel uploads have predictable IDs
 */
const generateConsistentId = (process) => {
  // If the process already has an id that starts with 'process-', use it
  if (process.id && typeof process.id === 'string' && process.id.startsWith('process-')) {
    return process.id;
  }
  
  // If the process has a name, use it to generate an ID
  if (process.name) {
    return `process-${process.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }
  
  // If the process has a title, use it to generate an ID
  if (process.title) {
    return `process-${process.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }
  
  // Fallback to a random ID if no name or title
  return `process-${Math.floor(Math.random() * 10000)}`;
};

/**
 * Handler for Excel file upload and processing
 */
const handler = async (event, context, dbContext) => {
  // Set CORS headers directly for all responses
  const headers = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight request directly
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request directly in uploadExcelData');
    return {
      statusCode: 204,
      headers
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    
    if (!body.fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data provided' })
      };
    }

    // Convert base64 to buffer
    const base64Data = body.fileData.split(',')[1] || body.fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Parse Excel data
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Debug: Log available sheet names
    console.log('Excel file uploaded with sheets:', workbook.SheetNames);
    
    // Process based on the dataType
    const { dataType } = body;
    console.log('Data type requested:', dataType);
    
    // Check if dbContext is properly initialized
    if (!dbContext || !dbContext.db) {
      console.error('Database context is not properly initialized');
      console.log('dbContext:', dbContext);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not available' })
      };
    }

    // Process data based on type
    let result;
    if (dataType === 'processes') {
      result = await processProcessesData(workbook, dbContext);
    } else if (dataType === 'presentations') {
      result = await processPresentationsData(workbook, dbContext);
    } else {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: `Invalid data type: ${dataType}` }) 
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error processing Excel upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to process Excel file' })
    };
  }
};

/**
 * Find a sheet by name (case-insensitive)
 */
const findSheetByName = (workbook, name) => {
  const lowerName = name.toLowerCase();
  return workbook.SheetNames.find(sheet => sheet.toLowerCase() === lowerName);
};

/**
 * Process Excel data for processes and steps
 */
const processProcessesData = async (workbook, userId, options = {}) => {
  try {
    console.log('Starting processProcessesData function with userId:', userId);
    
    // Find sheets for processes and steps
    const processesSheetName = findSheetByName(workbook, 'Processes');
    const stepsSheetName = findSheetByName(workbook, 'Steps');
    
    if (!processesSheetName || !stepsSheetName) {
      throw new Error('Required sheets not found in Excel file. Please make sure your Excel file contains both "Processes" and "Steps" sheets.');
    }
    
    // Parse sheets into JSON
    const processesData = xlsx.utils.sheet_to_json(workbook.Sheets[processesSheetName]);
    const stepsData = xlsx.utils.sheet_to_json(workbook.Sheets[stepsSheetName]);
    
    // Log the data for debugging
    console.log(`Found ${processesData.length} processes and ${stepsData.length} steps in Excel`);
    console.log('Sample process ID format:', processesData[0]?.id); {
      throw new Error('No process data found in Excel file');
    }
    
    console.log(`Found ${processesData.length} processes in Excel`);
    console.log('Sample process data:', JSON.stringify(processesData[0]));
    
    // Find and parse Steps sheet before validation
    const stepsSheetName = findSheetByName(workbook, 'Steps');
    let stepsData = [];
    
    if (stepsSheetName) {
      const stepsSheet = workbook.Sheets[stepsSheetName];
      stepsData = xlsx.utils.sheet_to_json(stepsSheet);
      console.log(`Found ${stepsData.length} steps in Excel`);
      if (stepsData.length > 0) {
        console.log('Sample step data:', JSON.stringify(stepsData[0]));
      }
    }
    
    // VALIDATION: Check if all processes have an ID
    const processesWithoutId = processesData.filter(process => !process.id);
    if (processesWithoutId.length > 0) {
      throw new Error(`Validation failed: ${processesWithoutId.length} processes are missing ID fields. Please add IDs to all processes and try again.`);
    }
    
    // VALIDATION: Check if all steps have a processId
    const stepsWithoutProcessId = stepsData.filter(step => !step.processId);
    if (stepsWithoutProcessId.length > 0) {
      throw new Error(`Validation failed: ${stepsWithoutProcessId.length} steps are missing processId fields. Please add processId to all steps and try again.`);
    }
    
    // VALIDATION: Check if all step processIds match existing process IDs
    const processIdSet = new Set(processesData.map(process => process.id));
    const orphanedSteps = stepsData.filter(step => !processIdSet.has(step.processId));
    if (orphanedSteps.length > 0) {
      throw new Error(`Validation failed: ${orphanedSteps.length} steps reference process IDs that don't exist in the Processes sheet. Please fix these references and try again.`);
    }
    
    // If all validations pass, continue with processing
    console.log('All validations passed. Proceeding with import...');
    
    // Find optional sheets for benefits and before/after data
    // (Steps sheet was already processed above for validation)
    const benefitsSheetName = findSheetByName(workbook, 'Benefits');
    const beforeAfterSheetName = findSheetByName(workbook, 'BeforeAfter');
    
    // Parse optional sheets if they exist
    let benefitsData = [];
    let beforeAfterData = [];
    
    if (benefitsSheetName) {
      const benefitsSheet = workbook.Sheets[benefitsSheetName];
      benefitsData = xlsx.utils.sheet_to_json(benefitsSheet);
      console.log(`Found ${benefitsData.length} benefits in Excel`);
    }
    
    if (beforeAfterSheetName) {
      const beforeAfterSheet = workbook.Sheets[beforeAfterSheetName];
      beforeAfterData = xlsx.utils.sheet_to_json(beforeAfterSheet);
      console.log(`Found ${beforeAfterData.length} before/after items in Excel`);
    }
    
    // Normalize and map data
    const normalizedProcesses = processesData.map(process => {
      // CRITICAL: Preserve the exact original ID from Excel to maintain referential integrity
      // This ensures that steps with processId references will maintain their associations
      // DO NOT transform the ID in any way
      const processId = process.id; // Use exact original ID from Excel
      
      // Log the process ID preservation for debugging
      console.log(`Preserving original process ID: ${processId}`);
      
      // Find steps for this process
      // More flexible matching to handle different ID formats
      const processSteps = stepsData
        .filter(step => {
          // Try multiple ways to match steps to processes
          return (
            // Direct match
            step.processId === process.id ||
            // MongoDB ObjectId match
            (step.processId && process._id && step.processId === process._id.toString()) ||
            // Match by prefix (for cases where Excel has partial IDs)
            (step.processId && process.id && 
              (step.processId.startsWith(process.id) || process.id.startsWith(step.processId)))
          );
        })
        .map(step => {
          // Create a base step object with required fields
          const stepObj = {
            id: step.id || `step-${Math.floor(Math.random() * 10000)}`,
            title: step.title || '',
            description: step.description || '',
            order: step.order || 0,
            duration: step.duration || 0,
            status: step.status || 'active',
            // Always include videoUrl field, even if empty
            videoUrl: step.videoUrl || ''
          };
          
          // Log if video URL is found
          if (step.videoUrl) {
            console.log(`Found video URL for step ${stepObj.id}: ${step.videoUrl}`);
          } else {
            console.log(`No video URL found for step ${stepObj.id}`);
          }
          
          // Add imageUrl if present
          if (step.imageUrl) {
            stepObj.imageUrl = step.imageUrl;
          }
          
          // Add any other fields from the Excel that might be useful
          // This ensures we don't miss any fields defined in the schema
          Object.keys(step).forEach(key => {
            if (!['id', 'title', 'description', 'order', 'duration', 'status', 'processId', 'videoUrl', 'imageUrl'].includes(key)) {
              stepObj[key] = step[key];
            }
          });
          
          return stepObj;
        });
      
      // Find benefits for this process
      const processBenefits = benefitsData
        .filter(benefit => {
          // More flexible matching like we did for steps
          return (
            benefit.processId === process.id ||
            (benefit.processId && process._id && benefit.processId === process._id.toString()) ||
            (benefit.processId && process.id && 
              (benefit.processId.startsWith(process.id) || process.id.startsWith(benefit.processId)))
          );
        })
        .map(benefit => ({
          id: benefit.id || `benefit-${Math.floor(Math.random() * 10000)}`,
          title: benefit.title || '',
          description: benefit.description || ''
        }));
      
      // Find before/after data for this process
      const processBeforeAfter = beforeAfterData
        .filter(item => {
          // More flexible matching like we did for steps
          return (
            item.processId === process.id ||
            (item.processId && process._id && item.processId === process._id.toString()) ||
            (item.processId && process.id && 
              (item.processId.startsWith(process.id) || process.id.startsWith(item.processId)))
          );
        })
        .map(item => ({
          id: item.id || `ba-${Math.floor(Math.random() * 10000)}`,
          before: item.before || '',
          after: item.after || '',
          metric: item.metric || ''
        }));
      
      // Create base process object with standard fields
      const processObj = {
        id: processId,
        title: process.title || process.name || '',
        name: process.name || process.title || '',
        description: process.description || '',
        category: process.category || 'general',
        userId: process.userId || 'system',
        updatedAt: new Date(),
        updatedBy: 'excel-import',
        steps: processSteps,
        benefits: processBenefits,
        beforeAfter: processBeforeAfter
      };
      
      // Add any additional fields from the Excel that might be in the schema
      Object.keys(process).forEach(key => {
        if (!['id', 'title', 'name', 'description', 'category', 'userId', 'steps', 'benefits', 'beforeAfter'].includes(key)) {
          processObj[key] = process[key];
        }
      });
      
      return processObj;
    });
    
    // Log the normalized processes
    console.log('Normalized processes:', JSON.stringify(normalizedProcesses.map(p => ({ id: p.id, title: p.title }))));
    
    // Delete existing processes - now safe to do since we've validated the Excel data
    try {
      console.log('Deleting existing processes...');
      const beforeCount = await Process.countDocuments({});
      console.log(`Found ${beforeCount} existing processes before deletion`);
      
      // List all process IDs before deletion for debugging
      const existingProcesses = await Process.find({}, {id: 1, title: 1});
      console.log('Existing process IDs before deletion:');
      console.log(JSON.stringify(existingProcesses.map(p => ({id: p.id, title: p.title || p.name || ''}))));
      
      // CRITICAL: First use deleteMany with no filter to remove all processes
      // This ensures a clean slate for the import
      const deleteResult = await Process.deleteMany({});
      console.log(`MongoDB reported ${deleteResult.deletedCount} processes deleted`);
      
      // Double-check with collection-level deletion as a backup method if needed
      const afterFirstDelete = await Process.countDocuments({});
      if (afterFirstDelete > 0) {
        console.log(`First deletion incomplete. Trying direct collection method...`);
        const collectionDelete = await Process.collection.deleteMany({});
        console.log(`Collection method deleted ${collectionDelete.deletedCount} additional processes`);
      }
      
      // Final verification that database is empty before import
      const afterDeleteCount = await Process.countDocuments({});
      if (afterDeleteCount > 0) {
        console.error(`ERROR: Deletion failed! Still have ${afterDeleteCount} processes in database`);
        throw new Error(`Failed to delete all processes. ${afterDeleteCount} remain.`);
      } else {
        console.log('✅ Confirmed database is empty and ready for import.');
      }
    } catch (deleteError) {
      console.error('Error deleting existing processes:', deleteError);
      throw new Error(`Failed to delete existing processes: ${deleteError.message}`);
    }
    
    // Insert new processes
    try {
      console.log(`Inserting ${normalizedProcesses.length} new processes...`);
      const insertResult = await Process.insertMany(normalizedProcesses);
      console.log(`Inserted ${insertResult.length} processes`);
      
      // Verify insertion
      const afterCount = await Process.countDocuments({});
      console.log(`Found ${afterCount} processes after insertion`);
      
      return {
        success: true,
        message: `Successfully imported ${insertResult.length} processes`,
        count: insertResult.length
      };
    } catch (insertError) {
      console.error('Error inserting processes:', insertError);
      throw new Error(`Failed to insert processes: ${insertError.message}`);
    }
  } catch (error) {
    console.error('Error processing processes data:', error);
    throw error;
  }
};

/**
 * Process Excel data for presentations
 */
const processPresentationsData = async (workbook, dbContext) => {
  try {
    console.log('Processing presentations data from Excel...');
    
    // Find the Presentations sheet (case-insensitive)
    const presentationsSheetName = findSheetByName(workbook, 'Presentations');
    if (!presentationsSheetName) {
      throw new Error('Presentations sheet not found in Excel file');
    }
    
    // Parse presentations sheet
    const presentationsSheet = workbook.Sheets[presentationsSheetName];
    const presentationsData = xlsx.utils.sheet_to_json(presentationsSheet);
    
    if (!presentationsData || presentationsData.length === 0) {
      throw new Error('No presentation data found in Excel file');
    }
    
    console.log(`Found ${presentationsData.length} presentations in Excel`);
    
    // Normalize presentation data
    const normalizedPresentations = presentationsData.map(presentation => {
      // Ensure presentation has an ID
      const presentationId = presentation.id || `presentation-${Math.floor(Math.random() * 10000)}`;
      
      // Get the URL from the Excel data
      const url = presentation.url || '';
      
      // Detect source type from URL
      const sourceType = detectSourceType(url);
      
      // Set isLocal flag based on sourceType
      const isLocal = sourceType === 'local';
      
      // Generate and add directUrl based on source type
      const directUrl = generateDirectUrl(url, sourceType);
      
      // Generate and add viewerUrl
      let viewerUrl = null;
      if (!isLocal && directUrl) {
        const encodedUrl = encodeURIComponent(directUrl);
        viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
      }
      
      // Create normalized presentation object
      return {
        id: presentationId,
        title: presentation.title || '',
        description: presentation.description || '',
        type: presentation.type || 'general',
        tags: presentation.tags ? presentation.tags.split(',').map(tag => tag.trim()) : [],
        slides: presentation.slides || [],
        userId: presentation.userId || 'system',
        updatedAt: new Date(),
        updatedBy: 'excel-import',
        url: url,
        sourceType: sourceType,
        isLocal: isLocal,
        directUrl: directUrl,
        viewerUrl: viewerUrl
      };
    });
    
    // Delete existing presentations
    try {
      console.log('Deleting existing presentations...');
      const beforeCount = await Presentation.countDocuments({});
      console.log(`Found ${beforeCount} existing presentations before deletion`);
      
      const deleteResult = await Presentation.deleteMany({});
      console.log(`Deleted ${deleteResult.deletedCount} presentations`);
    } catch (deleteError) {
      console.error('Error deleting existing presentations:', deleteError);
      throw new Error(`Failed to delete existing presentations: ${deleteError.message}`);
    }
    
    // Insert new presentations
    try {
      console.log(`Inserting ${normalizedPresentations.length} new presentations...`);
      const insertResult = await Presentation.insertMany(normalizedPresentations);
      console.log(`Inserted ${insertResult.length} presentations`);
      
      // Verify insertion
      const afterCount = await Presentation.countDocuments({});
      console.log(`Found ${afterCount} presentations after insertion`);
      
      return {
        success: true,
        message: `Successfully imported ${insertResult.length} presentations`,
        count: insertResult.length
      };
    } catch (insertError) {
      console.error('Error inserting presentations:', insertError);
      throw new Error(`Failed to insert presentations: ${insertError.message}`);
    }
  } catch (error) {
    console.error('Error processing presentations data:', error);
    throw error;
  }
};

// Export the handler directly without middleware since we're handling CORS directly
module.exports = withDatabase(handler);
