/**
 * Validation Utilities
 * 
 * This file provides validation functions for MongoDB URIs and other data.
 * It's used by functions that import from '../utils/validation'.
 */

/**
 * Validate MongoDB URI format
 * @param {string} uri - MongoDB connection URI to validate
 * @returns {string|null} Error message or null if valid
 */
function validateMongoDBUri(uri) {
  if (!uri) return 'MongoDB URI is not defined';
  
  // Basic format validation - more flexible to allow query parameters
  const validFormat = /^mongodb(\+srv)?:\/\/.+:.+@.+\/.+/;
  if (!validFormat.test(uri)) {
    return 'MongoDB URI format is invalid. Expected format: mongodb(+srv)://username:password@host/database';
  }
  
  return null; // No error
}

module.exports = { validateMongoDBUri };
