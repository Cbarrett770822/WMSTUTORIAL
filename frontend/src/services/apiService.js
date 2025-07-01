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

// Get all presentations from database - no localStorage caching
export const fetchPresentations = async () => {
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
    
    // Do not cache to localStorage
    return processedResponse;
  } catch (error) {
    // Handle API errors consistently but don't use cached data
    console.error('Error fetching presentations from API:', error);
    return { 
      presentations: [],
      source: 'api',
      success: false,
      error: error.message
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
export const fetchProcesses = async (options = {}) => {
  const { bypassCache = true } = options; // Default to true to always bypass cache
  try {
    console.log('Fetching processes from API...');
    
    // Always clear any cached process data
    localStorage.removeItem('wms_process_data');
    localStorage.removeItem('wms_processes');
    
    // Always add a timestamp parameter for cache busting
    const timestamp = options.timestamp || Date.now();
    const fetchUrl = `${API_ENDPOINTS.PROCESSES}?t=${timestamp}`;
    
    console.log('Using URL with cache-busting parameter:', fetchUrl);
    
    // Always use cache: 'no-cache' to prevent browser caching
    const headers = await createHeaders();
    console.log('Fetching from URL:', fetchUrl);
    const response = await fetch(fetchUrl, { 
      headers,
      cache: 'no-cache',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching processes: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw API response data:', data);
    
    if (data.processes && Array.isArray(data.processes)) {
      console.log(`API returned ${data.processes.length} processes`);
      
      // Log each process to check titles
      data.processes.forEach((process, index) => {
        console.log(`Process ${index + 1} from API:`);
        console.log(`  ID: ${process._id || process.id}`);
        console.log(`  Title: ${process.title || 'NO TITLE'}`);
        console.log(`  Name: ${process.name || 'NO NAME'}`);
        console.log(`  Category: ${process.category || 'NO CATEGORY'}`);
      });
    }
    
    // Process the standardized response format
    const processedResponse = processApiResponse(data, 'processes', []);
    
    return processedResponse;
  } catch (error) {
    console.error('Error fetching processes:', error);
    
    // Return empty array instead of cached data
    return { 
      processes: [],
      source: 'api-error',
      success: false,
      error: error.message
    };
  }
};

// Save processes
export const saveProcessesToApi = async (processes) => {
  // Always save to database
  try {
    console.log('saveProcessesToApi called with processes:', JSON.stringify(processes));
    
    // Cache the data locally while we save to database
    localStorage.setItem('wms_processes', JSON.stringify(processes));
    
    // Get current user information for metadata
    const userJson = localStorage.getItem('wms_current_user');
    let user = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
        console.log('Current user for process save:', user.username);
      } catch (e) {
        console.warn('Error parsing current user:', e);
      }
    }
    
    // Format the request body as expected by the backend
    const requestBody = {
      processes: processes,
      metadata: {
        userId: user?.id || 'unknown',
        username: user?.username || 'unknown',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Sending request to saveProcesses endpoint:', JSON.stringify(requestBody));
    console.log('Request URL:', API_ENDPOINTS.SAVE_PROCESSES);
    
    const response = await fetch(API_ENDPOINTS.SAVE_PROCESSES, {
      method: 'POST',
      headers: createHeaders(true), // Include auth token
      body: JSON.stringify(requestBody),
    });
    
    console.log('saveProcesses response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from saveProcesses:', errorText);
      throw new Error(`Failed to save processes: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('saveProcesses response data:', responseData);
    
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
