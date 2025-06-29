const { connectToDatabase } = require('./utils/mongodb');
const Presentation = require('./models/Presentation');
const mongoose = require('mongoose');

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

// Function to save presentations with retry logic for transient errors
async function savePresentationsWithRetry(presentations, userId, maxRetries = 3) {
  let lastError = null;
  let updateResults = [];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Start a new session for each attempt
      const session = await mongoose.startSession();
      
      try {
        session.startTransaction();
        
        updateResults = [];
        
        // Process each presentation
        for (const presentation of presentations) {
          // Ensure the presentation has a userId (use the provided userId if not specified)
          if (!presentation.userId) {
            presentation.userId = userId;
          }
          
          // Check if this presentation already exists (by id)
          if (presentation.id) {
            // Use lean() to avoid potential read conflicts
            const existingPresentation = await Presentation.findOne(
              { id: presentation.id },
              null,
              { session }
            ).lean();
            
            let updateResult;
            if (existingPresentation) {
              // For existing presentations, use findOneAndUpdate without the _id field
              // to avoid MongoDB duplicate key errors
              const { _id, ...presentationWithoutId } = presentation;
              
              updateResult = await Presentation.findOneAndUpdate(
                { _id: existingPresentation._id },
                presentationWithoutId,
                { new: true, session }
              );
              console.log(`Updated existing presentation with id: ${presentation.id}`);
            } else {
              // Create new presentation with the provided id
              // Make sure we don't include any _id field that might have been sent
              const { _id, ...presentationWithoutId } = presentation;
              const newPresentation = new Presentation(presentationWithoutId);
              updateResult = await newPresentation.save({ session });
              console.log(`Created new presentation with id: ${presentation.id}`);
            }
            updateResults.push(updateResult);
            console.log(`Updated/inserted presentation with id: ${presentation.id}`);
          } else {
            // If no id is provided, generate one before creating
            const presentationWithId = {
              ...presentation,
              id: String(Date.now()) // Generate a string ID using current timestamp
            };
            const newPresentation = new Presentation(presentationWithId);
            await newPresentation.save({ session });
            updateResults.push(newPresentation);
            console.log('Created new presentation with generated id:', presentationWithId.id);
          }
        }
        
        console.log(`Updated/inserted ${updateResults.length} presentations`);
        
        // Commit the transaction
        await session.commitTransaction();
        console.log('Transaction committed successfully');
        
        // If we get here, the transaction was successful
        session.endSession();
        return updateResults;
      } catch (transactionError) {
        // Check if the session is still in a transaction before trying to abort
        if (session.inTransaction()) {
          try {
            await session.abortTransaction();
            console.log('Transaction aborted due to error');
          } catch (abortError) {
            console.error('Error aborting transaction:', abortError);
          }
        }
        
        // End the session regardless of abort success
        session.endSession();
        
        // If this is a transient error and we have retries left, we'll retry
        if (isTransientTransactionError(transactionError) && attempt < maxRetries) {
          lastError = transactionError;
          const delay = Math.pow(2, attempt) * 500; // Exponential backoff
          console.log(`Transient transaction error detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Try again
        }
        
        // If it's not a transient error or we're out of retries, rethrow
        throw transactionError;
      }
    } catch (error) {
      lastError = error;
      
      // If this is a transient error and we have retries left, we'll retry
      if (isTransientTransactionError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // Exponential backoff
        console.log(`Transient error detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Try again
      }
      
      // If it's not a transient error or we're out of retries, rethrow
      throw lastError;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to save presentations after multiple attempts');
}

exports.handler = async (event, context) => {
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

  context.callbackWaitsForEmptyEventLoop = false;
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

    // Connect to the database
    await connectToDatabase();
    
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
      const updateResults = await savePresentationsWithRetry(enhancedPresentations, metadataUserId);
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
