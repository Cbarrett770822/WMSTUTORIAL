/**
 * Environment Service
 * 
 * Centralized service for environment detection and configuration.
 * This eliminates redundant environment checks across the application.
 */

import config from '../config';

/**
 * Check if the application is running in development mode
 * @returns {boolean} - True if in development mode, false otherwise
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

/**
 * Check if the application is running in production mode
 * @returns {boolean} - True if in production mode, false otherwise
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Get the base URL for API requests
 * @returns {string} - API base URL
 */
export const getApiBaseUrl = () => {
  return isDevelopment() ? 
    config.apiUrl : 
    'https://wms-tutorial-app.netlify.app/.netlify/functions';
};

/**
 * Get the full URL for a specific API endpoint
 * @param {string} endpoint - API endpoint (without leading slash)
 * @returns {string} - Full API URL
 */
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${baseUrl}/${normalizedEndpoint}`;
};

/**
 * Get environment variables with fallbacks
 * @param {string} name - Environment variable name
 * @param {any} defaultValue - Default value if not found
 * @returns {string} - Environment variable value or default
 */
export const getEnvVar = (name, defaultValue = '') => {
  return process.env[name] || defaultValue;
};

/**
 * Get debug mode status
 * @returns {boolean} - True if debug mode is enabled
 */
export const isDebugMode = () => {
  // Check for debug mode in various places
  return process.env.DEBUG === 'true' || 
         localStorage.getItem('wms_debug_mode') === 'true' || 
         new URLSearchParams(window.location.search).get('debug') === 'true';
};

/**
 * Get current environment name
 * @returns {string} - Environment name (development, production, test)
 */
export const getEnvironmentName = () => {
  return process.env.NODE_ENV || 'development';
};

export default {
  isDevelopment,
  isProduction,
  getApiBaseUrl,
  getApiUrl,
  getEnvVar,
  isDebugMode,
  getEnvironmentName
};
