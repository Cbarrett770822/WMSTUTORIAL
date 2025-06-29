/**
 * Save Notes Function
 * 
 * This serverless function saves user notes to the database.
 * Uses middleware pattern for authentication, database connection, and CORS handling.
 */

const mongoose = require('mongoose');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Define the Notes schema if it doesn't exist in models
let Notes;
if (!mongoose.models.Notes) {
  const NotesSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
      index: true
    },
    notes: {
      type: Array,
      default: []
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });
  
  Notes = mongoose.model('Notes', NotesSchema);
} else {
  Notes = mongoose.models.Notes;
}

/**
 * Core handler function for saving user notes
 * This is wrapped with middleware for authentication, database, and CORS
 */
const saveNotesHandler = async (event, context, { userId, username, role, headers, mongoose }) => {
  // Diagnostics collection for debugging and monitoring
  const diagnostics = {
    environment: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      source: event.headers['user-agent'] || 'unknown'
    },
    userInfo: {
      userId,
      username,
      role
    }
  };

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      diagnostics.requestParsing = { success: true };
    } catch (parseError) {
      diagnostics.requestParsing = { 
        success: false, 
        error: parseError.message 
      };
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Invalid JSON in request body',
          error: isDevelopment ? parseError.message : 'Request body must be valid JSON',
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    const { notes } = requestBody;
    
    // Validate notes array
    if (!notes || !Array.isArray(notes)) {
      diagnostics.validation = { 
        success: false, 
        reason: !notes ? 'notes_missing' : 'notes_not_array' 
      };
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Notes must be provided as an array',
          error: 'Invalid request format',
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    diagnostics.validation = { success: true };
    
    // Update or create notes document
    const result = await Notes.findOneAndUpdate(
      { userId },
      { 
        userId,
        notes,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    diagnostics.dbOperation = { 
      success: true, 
      operation: 'findOneAndUpdate', 
      documentId: result._id.toString() 
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notes saved successfully',
        data: {
          userId,
          notesCount: notes.length,
          updatedAt: result.updatedAt
        },
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error saving notes:', error);
    diagnostics.error = { message: error.message, name: error.name };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to save notes: ${error.message}` 
      : 'An error occurred while saving notes';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: errorMessage,
        error: isDevelopment ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Internal server error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
};

// Export the handler with middleware applied
// withAuth middleware handles authentication
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withAuth(
    withDatabase(saveNotesHandler)
  ),
  { methods: ['POST'] } // Only allow POST requests
);
