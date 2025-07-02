const withCors = require('./middleware/withCors');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// For simplified authentication
const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function to determine if an error is a transient transaction error
const isTransientTransactionError = (error) => {
  // Check for MongoDB transient transaction error labels
  if (error.errorLabels && 
      (error.errorLabels.includes('TransientTransactionError') ||
       error.errorLabels.includes('UnknownTransactionCommitResult'))) {
    return true;
  }
  
  // Check for WriteConflict error code
  if (error.code === 112 || 
      (error.message && error.message.includes('WriteConflict'))) {
    return true;
  }
  
  return false;
};

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

// Function to save presentations with retry logic for transient errors
async function savePresentationsWithRetry(presentations, dbContext) {
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let session = null;
    let useTransaction = false;
    
    // Check if we can use transactions (MongoDB 4.0+)
    try {
      if (dbContext.client && typeof dbContext.client.startSession === 'function') {
        session = dbContext.client.startSession();
        session.startTransaction();
        useTransaction = true;
        console.log(`Transaction attempt ${attempt + 1} started`);
      } else {
        console.log(`Simple update attempt ${attempt + 1} started (transactions not available)`);
      }
      
      const updateResults = [];
      
      for (const presentation of presentations) {
        // Ensure the presentation has a url field (required by schema)
        if (!presentation.url) {
          if (presentation.localUrl) {
            presentation.url = presentation.localUrl;
          } else if (presentation.remoteUrl) {
            presentation.url = presentation.remoteUrl;
          } else {
            // If neither localUrl nor remoteUrl is available, use a placeholder
            presentation.url = '/placeholder-url';
          }
        }
        
        // Detect source type from URL
        const sourceType = detectSourceType(presentation.url);
        presentation.sourceType = sourceType;
        
        // Set isLocal flag based on sourceType
        presentation.isLocal = sourceType === 'local';
        
        // Generate and add directUrl based on source type
        const directUrl = generateDirectUrl(presentation.url, sourceType);
        presentation.directUrl = directUrl;
        
        // Generate and add viewerUrl
        if (!presentation.isLocal && directUrl) {
          const encodedUrl = encodeURIComponent(directUrl);
          presentation.viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
        }
        
        // Create a clean copy without _id to avoid conflicts
        const { _id, ...cleanPresentation } = presentation;
        
        // If presentation has an id, use upsert to update or create
        if (cleanPresentation.id) {
          // Use updateOne with upsert:true to handle both update and insert cases
          const updateResult = await dbContext.db.collection('presentations').updateOne(
            { id: cleanPresentation.id },
            { $set: cleanPresentation },
            { upsert: true }
          );
          
          if (updateResult.matchedCount > 0) {
            console.log(`Updated existing presentation with id: ${cleanPresentation.id}`);
          } else {
            console.log(`Created new presentation with id: ${cleanPresentation.id}`);
          }
          
          updateResults.push(cleanPresentation);
        } else {
          // If no id is provided, generate one before creating
          const presentationWithId = {
            ...cleanPresentation,
            id: String(Date.now()) // Generate a string ID using current timestamp
          };
          
          // Use updateOne with upsert instead of insertOne to avoid _id conflicts
          const updateResult = await dbContext.db.collection('presentations').updateOne(
            { id: presentationWithId.id },
            { $set: presentationWithId },
            { upsert: true }
          );
          
          updateResults.push(presentationWithId);
          console.log('Created new presentation with generated id:', presentationWithId.id);
        }
      }
      
      console.log(`Updated/inserted ${updateResults.length} presentations`);
      
      // Commit the transaction if we're using one
      if (useTransaction && session) {
        await session.commitTransaction();
        console.log('Transaction committed successfully');
        
        // End the session
        session.endSession();
      }
      
      return updateResults;
    } catch (error) {
      // Handle transaction errors if we're using transactions
      if (useTransaction && session) {
        // Check if the session is still in a transaction before trying to abort
        try {
          if (session.inTransaction()) {
            await session.abortTransaction();
            console.log('Transaction aborted due to error');
          }
          // End the session regardless of abort success
          session.endSession();
        } catch (abortError) {
          console.error('Error handling transaction cleanup:', abortError);
        }
      }
      
      // If this is a transient error and we have retries left, we'll retry
      if (isTransientTransactionError(error) && attempt < maxRetries) {
        lastError = error;
        const delay = Math.pow(2, attempt) * 500; // Exponential backoff
        console.log(`Transient transaction error detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Try again
      }
      
      // If it's not a transient error or we're out of retries, rethrow
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to save presentations after multiple attempts');
}

// Handler for saving presentations
const handler = async (event, context, dbContext) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Make sure we're using the correct HTTP method
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  let userId = null;
  let userRole = null;

  try {
    // Get the authorization token from the request headers
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    // Process authentication
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      if (token) {
        // For our simplified token format: "userId:username:role"
        const parts = token.split(':');
        if (parts.length === 3) {
          userId = parts[0];
          const username = parts[1];
          userRole = parts[2];
          console.log(`Authenticated request from user: ${username} with role: ${userRole}`);
        } else {
          console.log('Invalid token format');
        }
      }
    }
    
    // Check authentication for non-development environments
    if (!isDevelopment && !userId) {
      console.warn('No valid authentication provided in production environment');
      return { 
        statusCode: 401, 
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    } else if (isDevelopment && !userId) {
      console.log('Development mode: proceeding with fallback authentication');
      userId = 'dev-fallback-user';
      userRole = 'admin';
    }
    
    // Parse the request body
    let presentations;
    let requestMetadata = {};
    
    try {
      const requestData = JSON.parse(event.body);
      
      // Handle both formats: array of presentations or {presentations, metadata} object
      if (Array.isArray(requestData)) {
        // Legacy format: direct array of presentations
        presentations = requestData;
        console.log('Received legacy format (direct array) for presentations');
      } else if (requestData && Array.isArray(requestData.presentations)) {
        // New format: {presentations, metadata} object
        presentations = requestData.presentations;
        requestMetadata = requestData.metadata || {};
        console.log('Received new format with metadata for presentations');
      } else {
        throw new Error('Presentations data must be an array or an object with a presentations array');
      }
      
      if (!Array.isArray(presentations)) {
        throw new Error('Presentations data must be an array');
      }
    } catch (parseError) {
      console.error('Error parsing presentations data:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid presentations data format',
          details: parseError.message 
        })
      };
    }
    
    // Extract metadata from request if available
    const metadataUserId = requestMetadata.userId || userId;
    const metadataUsername = requestMetadata.username || 'unknown';
    
    // Log the operation we're about to perform
    console.log(`Saving ${presentations.length} presentations to database for user ${metadataUserId} (${metadataUsername})`);
    
    try {
      // Add metadata to presentations
      const enhancedPresentations = presentations.map(presentation => ({
        ...presentation,
        updatedAt: new Date(),
        updatedBy: metadataUserId || userId || 'system',
        updatedByUsername: metadataUsername || 'unknown',
        timestamp: requestMetadata.timestamp || new Date().toISOString()
      }));
      
      // Use our retry function to handle transient MongoDB errors
      const updateResults = await savePresentationsWithRetry(enhancedPresentations, dbContext);
      console.log(`Successfully saved ${updateResults.length} presentations with retry mechanism`);
      
      // Return success response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Successfully saved ${updateResults.length} presentations`,
          count: updateResults.length,
          data: updateResults
        })
      };
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      
      // In development, return more details about the error
      if (isDevelopment) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: `Database operation failed: ${dbError.message}`,
            stack: dbError.stack
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Failed to save presentations to database'
          })
        };
      }
    }
  } catch (error) {
    console.error('Unexpected error in savePresentations function:', error);
    
    // In development, return more details about the error
    if (isDevelopment) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: `Unexpected error: ${error.message}`,
          stack: error.stack
        })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'An unexpected error occurred'
        })
      };
    }
  }
};

// Apply middleware and export
// Make sure withCors is the outermost middleware to handle CORS properly
exports.handler = withCors(withAuth(withDatabase(handler), { requireAuth: true }));
