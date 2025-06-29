const { connectToDatabase } = require('./utils/mongodb');
const Process = require('./models/Process');
const mongoose = require('mongoose');

// For simplified authentication
const isDevelopment = process.env.NODE_ENV === 'development';

exports.handler = async (event, context) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        try {
          // Try to decode JWT token (if it's a JWT)
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            // This looks like a JWT token, try to decode the payload
            try {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              userId = payload.id || payload.userId || payload.sub;
              userRole = payload.role;
              console.log(`JWT authenticated request from user ID: ${userId} with role: ${userRole}`);
            } catch (jwtError) {
              console.warn('Failed to parse JWT token:', jwtError.message);
            }
          } else {
            // For our simplified token format: "userId:username:role"
            const parts = token.split(':');
            if (parts.length === 3) {
              userId = parts[0];
              const username = parts[1];
              userRole = parts[2];
              console.log(`Simple token authenticated request from user: ${username} with role: ${userRole}`);
            } else {
              console.log('Unrecognized token format');
            }
          }
        } catch (tokenError) {
          console.warn('Error processing token:', tokenError.message);
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
    let processes = [];
    let metadata = {};
    try {
      const parsedBody = JSON.parse(event.body);
      
      // Extract metadata if available
      if (parsedBody.metadata) {
        metadata = parsedBody.metadata;
        console.log('Request metadata:', metadata);
        
        // Use metadata userId if available and no userId from token
        if (!userId && metadata.userId && metadata.userId !== 'unknown') {
          userId = metadata.userId;
          console.log(`Using userId from metadata: ${userId}`);
        }
      }
      
      // Handle both formats: direct array or {processes: [...]} object
      processes = Array.isArray(parsedBody) ? parsedBody : (parsedBody.processes || []);
      console.log(`Parsed ${processes.length} processes from request body`);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request body format',
          details: isDevelopment ? parseError.message : undefined
        })
      };
    }
    
    // Add metadata to processes
    const enhancedProcesses = processes.map(process => ({
      ...process,
      userId: userId,
      updatedAt: new Date(),
      updatedBy: userId
    }));
    
    // Use a session for atomic operations
    const session = await mongoose.startSession();
    
    try {
      // Start a transaction
      session.startTransaction();
      
      // Process each process individually to update or insert
      const updateResults = [];
      
      for (const process of enhancedProcesses) {
        try {
          // Try to find an existing process with the same id
          if (process.id) {
            // First check if the process already exists
            const existingProcess = await Process.findOne({ id: process.id });
            
            if (existingProcess) {
              // If it exists, update it by _id to avoid duplicate key errors
              const updateResult = await Process.findByIdAndUpdate(
                existingProcess._id,
                { $set: process },
                { new: true, session }
              );
              updateResults.push(updateResult);
              console.log(`Updated existing process with id: ${process.id}`);
            } else {
              // If it doesn't exist, create a new one
              const newProcess = new Process(process);
              await newProcess.save({ session });
              updateResults.push(newProcess);
              console.log(`Created new process with id: ${process.id}`);
            }
          } else {
            // If no id is provided, create a new one
            const newProcess = new Process(process);
            await newProcess.save({ session });
            updateResults.push(newProcess);
            console.log('Created new process without id');
          }
        } catch (processError) {
          console.error(`Error processing item with id ${process.id || 'unknown'}:`, processError);
          throw processError; // Re-throw to be caught by the outer try-catch
        }
      }
      
      console.log(`Updated/inserted ${updateResults.length} processes`);
      
      // Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Processes saved successfully',
          count: updateResults.length
        })
      };
    } catch (dbError) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      console.error('Transaction aborted due to error:', dbError);
      throw dbError; // Re-throw to be caught by the outer try-catch
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: `Failed to save processes: ${error.message}`,
        details: isDevelopment ? error.stack : undefined
      })
    };
  }
};
