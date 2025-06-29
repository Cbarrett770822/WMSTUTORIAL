// API service for making requests to the Netlify functions
import config from '../config';
import { processApiResponse, logDiagnostics, handleApiError } from '../utils/apiResponseUtils';

// Auto-detect development mode based on environment or hostname
const isDevelopment = process.env.NODE_ENV === 'development' || 
  !process.env.NODE_ENV || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Database API endpoints
const API_ENDPOINTS = {
  PRESENTATIONS: `${config.apiUrl}/.netlify/functions/getPresentations`,
  SAVE_PRESENTATIONS: `${config.apiUrl}/.netlify/functions/savePresentations`,
  PROCESSES: `${config.apiUrl}/.netlify/functions/getProcesses`,
  SAVE_PROCESSES: `${config.apiUrl}/.netlify/functions/saveProcesses`,
  SETTINGS: `${config.apiUrl}/.netlify/functions/getSettings`,
  SAVE_SETTINGS: `${config.apiUrl}/.netlify/functions/saveSettings`,
  NOTES: `${config.apiUrl}/.netlify/functions/getNotes`,
  SAVE_NOTES: `${config.apiUrl}/.netlify/functions/saveNotes`
};

// Empty fallback data
const EMPTY_PRESENTATIONS = [];
const EMPTY_PROCESSES = [];
const EMPTY_NOTES = [];

/**
 * Get authentication token for API requests
 * @returns {string|null} - Authentication token or null if not available
 */
const getAuthToken = () => {
  return localStorage.getItem('wms_auth_token');
};

/**
 * Create headers for API requests
 * @param {boolean} includeAuth - Whether to include authentication token
 * @returns {Object} - Headers object
 */
const createHeaders = (includeAuth = true) => {
  // Only include essential headers to avoid CORS issues
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Load presentations from localStorage (only as a cache, not as primary source)
const loadCachedPresentations = () => {
  const storedPresentations = localStorage.getItem('wms_presentations');
  if (storedPresentations) {
    try {
      return JSON.parse(storedPresentations);
    } catch (error) {
      console.error('Error parsing stored presentations:', error);
    }
  }
  return EMPTY_PRESENTATIONS;
};

// Save presentations to localStorage as a cache
const cachePresentations = (presentations) => {
  localStorage.setItem('wms_presentations', JSON.stringify(presentations));
  return presentations;
};

// Get all presentations from database
export const fetchPresentations = async () => {
  // Load cached data for immediate display while we fetch from database
  const cachedPresentations = loadCachedPresentations();
  
  // Always try to fetch from database, regardless of development mode
  try {
    console.log('Fetching presentations from database...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(API_ENDPOINTS.PRESENTATIONS, {
      signal: controller.signal,
      headers: createHeaders(true) // Include auth token
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Successfully fetched presentations from API');
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the standardized response format
    const processedResponse = processApiResponse(responseData, 'presentations', []);
    
    // If we got empty data from the API, return empty array
    if (!processedResponse.presentations || processedResponse.presentations.length === 0) {
      console.log('Database returned empty presentations');
      return { presentations: [], source: 'database', success: true };
    }
    
    // Cache the database data to localStorage for faster loading next time
    cachePresentations(processedResponse.presentations);
    return processedResponse;
  } catch (error) {
    // Handle API errors consistently
    const errorResponse = handleApiError(error, 'presentations', cachedPresentations);
    
    // If database fetch fails, use cached data but indicate the error
    return { 
      ...errorResponse,
      source: 'cache'
    };
  }
};

// Save presentations to database
export const savePresentationsToApi = async (presentations) => {
  // Always save to database, regardless of development mode
  try {
    // Cache the data locally while we save to database
    cachePresentations(presentations);
    
    const response = await fetch(API_ENDPOINTS.SAVE_PRESENTATIONS, {
      method: 'POST',
      headers: createHeaders(true), // Include auth token
      body: JSON.stringify(presentations),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save presentations: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the standardized response format
    const processedResponse = processApiResponse(responseData, 'presentations', presentations);
    
    if (!processedResponse.success) {
      throw new Error(processedResponse.message || 'Failed to save presentations');
    }
    
    return processedResponse;
  } catch (error) {
    // Handle API errors consistently
    const errorResponse = handleApiError(error, 'presentations', presentations);
    console.error('Error saving presentations:', errorResponse.error);
    throw error;
  }
};

// Get all processes
export const fetchProcesses = async () => {
  // Load cached data for immediate display while we fetch from database
  let cachedProcesses = [];
  const storedProcesses = localStorage.getItem('wms_processes');
  if (storedProcesses) {
    try {
      cachedProcesses = JSON.parse(storedProcesses);
    } catch (error) {
      console.error('Error parsing stored processes:', error);
    }
  }
  
  // Always try to fetch from database
  try {
    console.log('Fetching processes from database...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(API_ENDPOINTS.PROCESSES, {
      signal: controller.signal,
      headers: createHeaders(true) // Include auth token
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Successfully fetched processes from database');
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the standardized response format
    const processedResponse = processApiResponse(responseData, 'processes', []);
    
    // If we got empty data from the API, return empty array
    if (!processedResponse.processes || processedResponse.processes.length === 0) {
      console.log('Database returned empty processes');
      return { processes: [], source: 'database', success: true };
    }
    
    // Cache the database data to localStorage for faster loading next time
    localStorage.setItem('wms_processes', JSON.stringify(processedResponse.processes));
    return processedResponse;
  } catch (error) {
    // Handle API errors consistently
    const errorResponse = handleApiError(error, 'processes', cachedProcesses);
    
    // If database fetch fails, use cached data but indicate the error
    return { 
      ...errorResponse,
      source: 'cache'
    };
  }
};

// Save processes
export const saveProcessesToApi = async (processes) => {
  // Always save to database
  try {
    // Cache the data locally while we save to database
    localStorage.setItem('wms_processes', JSON.stringify(processes));
    
    const response = await fetch(API_ENDPOINTS.SAVE_PROCESSES, {
      method: 'POST',
      headers: createHeaders(true), // Include auth token
      body: JSON.stringify(processes),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save processes: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the standardized response format
    const processedResponse = processApiResponse(responseData, 'processes', processes);
    
    if (!processedResponse.success) {
      throw new Error(processedResponse.message || 'Failed to save processes');
    }
    
    return processedResponse;
  } catch (error) {
    // Handle API errors consistently
    const errorResponse = handleApiError(error, 'processes', processes);
    console.error('Error saving processes:', errorResponse.error);
    throw error;
  }
};
