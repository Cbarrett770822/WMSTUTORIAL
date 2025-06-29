/**
 * API Response Utilities
 * 
 * This module provides utilities for handling the standardized API response format
 * from the refactored backend middleware pattern.
 */

/**
 * Process a standardized API response and extract relevant data
 * 
 * @param {Object} response - The API response object
 * @param {string} dataKey - The key to extract from the response (e.g., 'presentations', 'notes')
 * @param {Object} fallbackData - Fallback data to use if extraction fails
 * @returns {Object} - Processed response with extracted data and metadata
 */
export const processApiResponse = (response, dataKey, fallbackData = null) => {
  // Check if response exists and has the success flag
  if (!response) {
    console.error('API Response is null or undefined');
    return {
      success: false,
      [dataKey]: fallbackData,
      source: 'error',
      error: 'No response received from server'
    };
  }

  // Check if the response has the success flag
  if (response.success === undefined) {
    // Legacy response format - return as is
    console.log('Legacy API response format detected');
    return response;
  }

  // Handle successful responses
  if (response.success === true) {
    // Extract the data from the response
    const extractedData = response[dataKey] || response.data?.[dataKey] || fallbackData;
    
    return {
      success: true,
      [dataKey]: extractedData,
      source: response.source || 'database',
      count: extractedData?.length || 0,
      message: response.message,
      timestamp: response.timestamp
    };
  } 
  
  // Handle error responses
  return {
    success: false,
    [dataKey]: fallbackData,
    source: 'error',
    error: response.error || response.message || 'Unknown error',
    message: response.message || 'An error occurred',
    timestamp: response.timestamp
  };
};

/**
 * Log diagnostics information if in development mode
 * 
 * @param {Object} response - The API response object
 */
export const logDiagnostics = (response) => {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
    !process.env.NODE_ENV || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  if (isDevelopment && response?.diagnostics) {
    console.group('API Diagnostics');
    console.log('Timestamp:', response.diagnostics.timestamp);
    console.log('Environment:', response.diagnostics.environment);
    console.log('Request Info:', response.diagnostics.requestInfo);
    
    if (response.diagnostics.userInfo) {
      console.log('User Info:', response.diagnostics.userInfo);
    }
    
    if (response.diagnostics.error) {
      console.error('Error Details:', response.diagnostics.error);
    }
    
    if (response.diagnostics.dbOperation) {
      console.log('Database Operation:', response.diagnostics.dbOperation);
    }
    
    console.groupEnd();
  }
};

/**
 * Handle API errors consistently
 * 
 * @param {Error} error - The error object
 * @param {string} dataKey - The key for the data in the response
 * @param {Object} fallbackData - Fallback data to use if extraction fails
 * @returns {Object} - Standardized error response
 */
export const handleApiError = (error, dataKey, fallbackData = null) => {
  console.error(`API Error (${dataKey}):`, error);
  
  return {
    success: false,
    [dataKey]: fallbackData,
    source: 'error',
    error: error.message || 'Unknown error',
    message: `Failed to process ${dataKey}`,
    timestamp: new Date().toISOString()
  };
};
