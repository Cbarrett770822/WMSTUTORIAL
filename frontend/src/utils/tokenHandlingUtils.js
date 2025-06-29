/**
 * Token Handling Utilities
 * 
 * This module provides utilities for handling authentication tokens
 * with the refactored backend middleware pattern.
 */

/**
 * Extract token from Authorization header
 * 
 * @param {string} authHeader - The Authorization header value
 * @returns {string|null} - The extracted token or null if not found
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  return authHeader; // Return the raw token if not in Bearer format
};

/**
 * Parse JWT token to extract payload
 * 
 * @param {string} token - The JWT token
 * @returns {Object|null} - The decoded payload or null if invalid
 */
export const parseToken = (token) => {
  if (!token) return null;
  
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

/**
 * Check if a token is expired
 * 
 * @param {string} token - The JWT token
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return true;
  
  // Convert exp to milliseconds (it's in seconds)
  const expiry = payload.exp * 1000;
  return Date.now() >= expiry;
};

/**
 * Get user info from token
 * 
 * @param {string} token - The JWT token
 * @returns {Object|null} - User info or null if invalid
 */
export const getUserInfoFromToken = (token) => {
  const payload = parseToken(token);
  if (!payload) return null;
  
  return {
    id: payload.userId || payload.sub,
    username: payload.username,
    role: payload.role,
    exp: payload.exp
  };
};

/**
 * Store token in localStorage
 * 
 * @param {string} token - The token to store
 */
export const storeToken = (token) => {
  if (!token) return;
  localStorage.setItem('wms_auth_token', token);
};

/**
 * Remove token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('wms_auth_token');
};

/**
 * Get token from localStorage
 * 
 * @returns {string|null} - The stored token or null if not found
 */
export const getStoredToken = () => {
  return localStorage.getItem('wms_auth_token');
};
