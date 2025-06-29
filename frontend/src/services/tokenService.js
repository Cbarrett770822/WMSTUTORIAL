/**
 * Token Service
 * 
 * Centralized service for handling authentication tokens.
 * This eliminates redundant token handling code across the application.
 */

// Constants
const AUTH_TOKEN_KEY = 'wms_auth_token';
const CURRENT_USER_KEY = 'wms_current_user';

/**
 * Get authentication token from localStorage
 * @returns {string|null} - Authentication token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Set authentication token in localStorage
 * @param {string} token - Authentication token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

/**
 * Clear authentication token from localStorage
 */
export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

/**
 * Check if user is authenticated (has a token)
 * @returns {boolean} - True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Extract user ID from token
 * @param {string} token - Token in format userId:username:role or other supported formats
 * @returns {string|null} - User ID or null if not found/invalid
 */
export const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    
    // Check if it's our simplified token format (userId:username:role)
    if (token.includes(':')) {
      const parts = token.split(':');
      if (parts.length >= 1) {
        return parts[0]; // First part is userId
      }
    }
    
    // Check for development fallback tokens
    if (token.startsWith('dev-fallback')) {
      // Extract username from token if it's in the format 'dev-fallback-username'
      if (token === 'dev-fallback') {
        return 'admin-dev-id'; // Legacy format
      } else if (token.startsWith('dev-fallback-')) {
        const parts = token.split('-');
        if (parts.length >= 3) {
          const username = parts[2];
          return `${username}-dev-id`; // username-dev-id format
        }
      }
    }
    
    // For backward compatibility, try JWT token format
    if (token.split('.').length === 3) {
      try {
        // Decode the payload (middle part)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.sub || null;
      } catch (jwtError) {
        console.warn('Error parsing JWT payload:', jwtError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
};

/**
 * Extract username from token
 * @param {string} token - Token in format userId:username:role or other supported formats
 * @returns {string|null} - Username or null if not found/invalid
 */
export const getUsernameFromToken = (token) => {
  try {
    if (!token) return null;
    
    // Check if it's our simplified token format (userId:username:role)
    if (token.includes(':')) {
      const parts = token.split(':');
      if (parts.length >= 2) {
        return parts[1]; // Second part is username
      }
    }
    
    // Check for development fallback tokens
    if (token.startsWith('dev-fallback')) {
      // Extract username from token if it's in the format 'dev-fallback-username'
      if (token === 'dev-fallback') {
        return 'admin'; // Legacy format
      } else if (token.startsWith('dev-fallback-')) {
        const parts = token.split('-');
        if (parts.length >= 3) {
          return parts[2]; // Third part is username
        }
      }
    }
    
    // For backward compatibility, try JWT token format
    if (token.split('.').length === 3) {
      try {
        // Decode the payload (middle part)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username || payload.name || null;
      } catch (jwtError) {
        console.warn('Error parsing JWT payload:', jwtError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting username from token:', error);
    return null;
  }
};

/**
 * Extract role from token
 * @param {string} token - Token in format userId:username:role or other supported formats
 * @returns {string|null} - Role or null if not found/invalid
 */
export const getRoleFromToken = (token) => {
  try {
    if (!token) return null;
    
    // Check if it's our simplified token format (userId:username:role)
    if (token.includes(':')) {
      const parts = token.split(':');
      if (parts.length >= 3) {
        return parts[2]; // Third part is role
      }
    }
    
    // Check for development fallback tokens
    if (token.startsWith('dev-fallback')) {
      // Extract username from token if it's in the format 'dev-fallback-username'
      if (token === 'dev-fallback') {
        return 'admin'; // Legacy format
      } else if (token.startsWith('dev-fallback-')) {
        const parts = token.split('-');
        if (parts.length >= 3) {
          const username = parts[2];
          return username === 'admin' ? 'admin' : (username === 'supervisor' ? 'supervisor' : 'user');
        }
      }
    }
    
    // For backward compatibility, try JWT token format
    if (token.split('.').length === 3) {
      try {
        // Decode the payload (middle part)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || null;
      } catch (jwtError) {
        console.warn('Error parsing JWT payload:', jwtError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting role from token:', error);
    return null;
  }
};

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null if not found/invalid
 */
export const getCurrentUser = () => {
  try {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get current user ID from localStorage or token
 * @returns {string} - User ID or 'guest' if not authenticated
 */
export const getCurrentUserId = () => {
  try {
    // First try to get from auth token
    const token = getAuthToken();
    if (token) {
      const userId = getUserIdFromToken(token);
      if (userId) return userId;
    }
    
    // Fall back to user data in localStorage
    const user = getCurrentUser();
    if (user) {
      return user.id || user._id || 'guest';
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return 'guest';
};

/**
 * Format a token for use in Authorization header
 * @param {string} token - Raw token
 * @returns {string} - Formatted token with Bearer prefix if needed
 */
export const formatAuthHeader = (token) => {
  if (!token) return '';
  
  // If token already has Bearer prefix, return as is
  if (token.toLowerCase().startsWith('bearer ')) {
    return token;
  }
  
  // Otherwise, add Bearer prefix
  return `Bearer ${token}`;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    
    // Only JWT tokens can be checked for expiration
    if (token.split('.').length !== 3) return false;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    
    const expirationDate = new Date(payload.exp * 1000);
    return expirationDate < new Date();
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired on error
  }
};

/**
 * Get token type (simplified, jwt, dev-fallback)
 * @param {string} token - Token to check
 * @returns {string} - Token type
 */
export const getTokenType = (token) => {
  if (!token) return 'none';
  if (token.includes(':')) return 'simplified';
  if (token.split('.').length === 3) return 'jwt';
  if (token.startsWith('dev-fallback')) return 'dev-fallback';
  return 'unknown';
};

export default {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  isAuthenticated,
  getUserIdFromToken,
  getUsernameFromToken,
  getRoleFromToken,
  getCurrentUser,
  getCurrentUserId,
  formatAuthHeader,
  isTokenExpired,
  getTokenType
};
