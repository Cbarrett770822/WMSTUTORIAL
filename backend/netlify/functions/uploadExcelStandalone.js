// Standalone Excel upload function with direct CORS handling
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Import models
const Process = mongoose.models.Process || mongoose.model('Process', require('./models/Process').schema);
const Presentation = mongoose.models.Presentation || mongoose.model('Presentation', require('./models/Presentation').schema);

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/test?retryWrites=true&w=majority';
console.log('MongoDB URI configured:', MONGODB_URI ? 'URI exists (not showing for security)' : 'URI is missing');

/**
 * Generate a consistent ID for processes
 */
const generateConsistentId = (process) => {
  if (process.id && typeof process.id === 'string' && process.id.startsWith('process-')) {
    return process.id;
  }
  
  if (process.name) {
    return `process-${process.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }
  
  if (process.title) {
    return `process-${process.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }
  
  return `process-${Math.floor(Math.random() * 10000)}`;
};

/**
 * Find a sheet by name (case-insensitive)
 */
const findSheetByName = (workbook, name) => {
  const lowerName = name.toLowerCase();
  return workbook.SheetNames.find(sheet => sheet.toLowerCase() === lowerName);
};

/**
 * Process Excel data for processes
 */
const processProcessesData = async (workbook) => {
  try {
    console.log('Processing processes data from Excel...');
    
    // Find the Processes sheet (case-insensitive)
    const processesSheetName = findSheetByName(workbook, 'Processes');
    if (!processesSheetName) {
      throw new Error('Processes sheet not found in Excel file');
    }
    
    // Parse processes sheet
    const processesSheet = workbook.Sheets[processesSheetName];
    const processesData = xlsx.utils.sheet_to_json(processesSheet);
    
    if (!processesData || processesData.length === 0) {
      throw new Error('No process data found in Excel file');
    }
    
    console.log(`Found ${processesData.length} processes in Excel`);
    
    // Find optional sheets for steps, benefits, and before/after data
    const stepsSheetName = findSheetByName(workbook, 'Steps');
    const benefitsSheetName = findSheetByName(workbook, 'Benefits');
    const beforeAfterSheetName = findSheetByName(workbook, 'BeforeAfter');
    
    // Parse optional sheets if they exist
    let stepsData = [];
    let benefitsData = [];
    let beforeAfterData = [];
    
    if (stepsSheetName) {
      const stepsSheet = workbook.Sheets[stepsSheetName];
      stepsData = xlsx.utils.sheet_to_json(stepsSheet);
      console.log(`Found ${stepsData.length} steps in Excel`);
    }
    
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
    
    // Delete all existing processes before inserting new ones
    console.log('BEFORE DELETION: Checking existing Process documents in the database...');
    const existingCount = await Process.countDocuments({});
    console.log(`Found ${existingCount} existing Process documents`);
    
    // Use deleteMany to remove all Process documents first
    console.log('Deleting all existing Process documents...');
    const deleteResult = await Process.deleteMany({});
    console.log(`Deletion result: ${deleteResult.deletedCount} documents deleted`);
    
    // Double check deletion happened properly
    const remainingCount = await Process.countDocuments({});
    console.log(`AFTER DELETION: ${remainingCount} Process documents remain`);
    
    if (remainingCount > 0) {
      console.log('WARNING: Not all Process documents were deleted! Using direct MongoDB client as fallback...');
      
      // Use a direct MongoDB client to delete all processes as a fallback
      try {
        const client = await MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db();
        const collection = db.collection('processes');
        
        const collectionDeleteResult = await collection.deleteMany({});
        console.log(`Collection-level deletion result: ${collectionDeleteResult.deletedCount} documents deleted`);
        
        // Final check
        const finalCount = await Process.countDocuments({});
        console.log(`FINAL CHECK: ${finalCount} Process documents remain after collection-level deletion`);
        
        await client.close();
      } catch (mongoError) {
        console.error('Error during direct MongoDB deletion:', mongoError);
      }
    }
    
    // Normalize and map data
    const normalizedProcesses = processesData.map(process => {
      // Preserve the original MongoDB ObjectID from Excel instead of generating a new one
      const processId = process.id || generateConsistentId(process);
      
      // Find steps for this process with flexible matching to handle various ID formats
      const processSteps = stepsData
        .filter(step => {
          return (
            step.processId === process.id ||
            (step.processId && process._id && step.processId === process._id.toString()) ||
            (step.processId && process.id && 
              (step.processId.startsWith(process.id) || process.id.startsWith(step.processId)))
          );
        })
        .map(step => {
          // Log video URL if present
          if (step.videoUrl) {
            console.log(`Found video URL for step ${step.id || step.title}: ${step.videoUrl}`);
          }
          
          // Log video URL if present
          if (step.videoUrl) {
            console.log(`Found video URL for step ${step.id || step.title}: ${step.videoUrl}`);
          }
          
          // Create a base step object with required fields - preserve original IDs
          const stepObj = {
            id: step.id || `step-${Math.floor(Math.random() * 10000)}`,  // Preserve original step ID
            title: step.title || '',
            description: step.description || '',
            order: step.order || 0,
            duration: step.duration || 0,
            status: step.status || 'active',
            // Explicitly handle videoUrl to ensure it's always included
            videoUrl: step.videoUrl || ''
          };
          
          // Add all additional fields from the Excel data
          Object.keys(step).forEach(key => {
            if (!['id', 'processId', 'title', 'description', 'order', 'duration', 'status'].includes(key)) {
              stepObj[key] = step[key];
            }
          });
          
          return stepObj;
        });
      
      // Find benefits for this process
      const processBenefits = benefitsData
        .filter(benefit => benefit.processId === process.id)
        .map(benefit => ({
          id: benefit.id || `benefit-${Math.floor(Math.random() * 10000)}`,
          title: benefit.title || '',
          description: benefit.description || ''
        }));
      
      // Find before/after data for this process
      const processBeforeAfter = beforeAfterData
        .filter(item => item.processId === process.id)
        .map(item => ({
          id: item.id || `ba-${Math.floor(Math.random() * 10000)}`,
          before: item.before || '',
          after: item.after || '',
          metric: item.metric || ''
        }));
      
      // Create normalized process object
      return {
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
    });
    
    // Delete existing processes
    const deleteResult = await Process.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} processes`);
    
    // Final verification that all old processes are gone
    const verifyCount = await Process.countDocuments({});
    if (verifyCount > 0) {
      console.error(`CRITICAL ERROR: Failed to delete all processes. ${verifyCount} documents still exist before insert.`);
    } else {
      console.log('Verified all processes were deleted successfully. Ready to insert new data.');
    }
    
    // Insert new processes
    const insertResult = await Process.insertMany(normalizedProcesses);
    console.log(`Inserted ${insertResult.length} processes`);
    
    // Verify inserted documents
    const finalProcessCount = await Process.countDocuments({});
    console.log(`Final process count: ${finalProcessCount}`);
    
    return {
      success: true,
      message: `Successfully imported ${insertResult.length} processes`,
      count: insertResult.length
    };
  } catch (error) {
    console.error('Error processing processes data:', error);
    throw error;
  }
};

/**
 * Helper function to detect source type from URL
 */
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

/**
 * Helper function to generate direct URL based on source type
 */
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

/**
 * Process Excel data for presentations
 */
const processPresentationsData = async (workbook) => {
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
    
    // Log the URLs from Excel for debugging
    presentationsData.forEach((presentation, index) => {
      console.log(`Excel Presentation #${index + 1} URL: ${presentation.url || 'not set'}`);
      
      // Check if URL is missing and log a warning
      if (!presentation.url) {
        console.warn(`WARNING: Presentation #${index + 1} (${presentation.title || 'Untitled'}) has no URL!`);
      }
    });
    
    // Normalize presentation data
    const normalizedPresentations = presentationsData.map(presentation => {
      // Ensure presentation has an ID
      const presentationId = presentation.id || `presentation-${Math.floor(Math.random() * 10000)}`;
      
      // Get the URL from the Excel data - check remoteUrl and localUrl fields if url is not present
      // This handles the case where the Excel template has remoteUrl/localUrl columns instead of url
      let url = presentation.url;
      
      if (!url && presentation.remoteUrl) {
        console.log(`Using remoteUrl for presentation ${presentationId}: ${presentation.remoteUrl}`);
        url = presentation.remoteUrl;
      } else if (!url && presentation.localUrl) {
        console.log(`Using localUrl for presentation ${presentationId}: ${presentation.localUrl}`);
        url = presentation.localUrl;
      } else if (!url) {
        // If no URL is found in any field, generate a placeholder
        url = `https://example.com/presentations/${presentationId}.pptx`;
        console.log(`No URL found, using placeholder: ${url}`);
      }
      console.log(`Processing URL for presentation ${presentationId}: ${url}`);
      
      // Detect source type from URL
      const sourceType = detectSourceType(url);
      console.log(`Detected source type: ${sourceType}`);
      
      // Set isLocal flag based on sourceType
      const isLocal = sourceType === 'local';
      
      // Generate and add directUrl based on source type
      const directUrl = generateDirectUrl(url, sourceType);
      console.log(`Generated direct URL: ${directUrl}`);
      
      // Generate and add viewerUrl
      let viewerUrl = null;
      if (!isLocal && directUrl) {
        const encodedUrl = encodeURIComponent(directUrl);
        viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
        console.log(`Generated viewer URL: ${viewerUrl}`);
      }
      
      // Create normalized presentation object
      return {
        id: presentationId,
        title: presentation.title || '',
        description: presentation.description || '',
        url: url, // Use the URL from Excel
        fileType: presentation.fileType || 'pptx',
        sourceType: sourceType,
        isLocal: isLocal,
        directUrl: directUrl,
        viewerUrl: viewerUrl,
        type: presentation.type || 'general',
        tags: presentation.tags ? presentation.tags.split(',').map(tag => tag.trim()) : [],
        slides: presentation.slides || [],
        userId: presentation.userId || 'system',
        updatedAt: new Date(),
        updatedBy: 'excel-import'
      };
    });
    
    // Delete existing presentations
    const deleteResult = await Presentation.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} presentations`);
    
    // Insert new presentations
    const insertResult = await Presentation.insertMany(normalizedPresentations);
    console.log(`Inserted ${insertResult.length} presentations`);
    
    return {
      success: true,
      message: `Successfully imported ${insertResult.length} presentations`,
      count: insertResult.length
    };
  } catch (error) {
    console.error('Error processing presentations data:', error);
    throw error;
  }
};

/**
 * Connect to MongoDB
 */
const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Using existing mongoose connection');
      return mongoose.connection;
    }
    
    if (!MONGODB_URI) {
      throw new Error('MongoDB URI is not configured. Please check environment variables.');
    }
    
    console.log('Connecting to MongoDB...');
    console.log('Connection options:', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    console.log('Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Error details:', error);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('Server selection error - check if MongoDB Atlas IP whitelist includes Netlify IPs');
    }
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Log request details
  console.log('Request method:', event.httpMethod);
  console.log('Request headers:', JSON.stringify(event.headers));
  
  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
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
    // Connect to database
    await connectToDatabase();
    
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
    console.log('Excel file uploaded with sheets:', workbook.SheetNames);
    
    // Process based on the dataType
    const { dataType } = body;
    console.log('Data type requested:', dataType);
    
    // Process data based on type
    let result;
    if (dataType === 'processes') {
      result = await processProcessesData(workbook);
    } else if (dataType === 'presentations') {
      result = await processPresentationsData(workbook);
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
