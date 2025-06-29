/**
 * Log Service
 * 
 * Centralized service for consistent logging across the application.
 * This service is environment-aware, only logging in development mode
 * unless explicitly configured otherwise.
 */

// Constants
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Configuration
let config = {
  minLevel: process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
  enableRemoteLogging: false,
  prefix: '[WMS]',
  showTimestamp: true
};

/**
 * Configure the logging service
 * @param {Object} options - Configuration options
 * @param {string} options.minLevel - Minimum log level to display (DEBUG, INFO, WARN, ERROR, NONE)
 * @param {boolean} options.enableRemoteLogging - Whether to send logs to a remote service
 * @param {string} options.prefix - Prefix for all log messages
 * @param {boolean} options.showTimestamp - Whether to include timestamps in log messages
 */
export const configure = (options = {}) => {
  config = { ...config, ...options };
  
  // Convert string level to numeric level if needed
  if (typeof config.minLevel === 'string') {
    config.minLevel = LOG_LEVELS[config.minLevel.toUpperCase()] || config.minLevel;
  }
};

/**
 * Format a log message with prefix and timestamp if configured
 * @param {string} message - The message to format
 * @returns {string} - Formatted message
 */
const formatMessage = (message) => {
  let formattedMessage = '';
  
  if (config.prefix) {
    formattedMessage += `${config.prefix} `;
  }
  
  if (config.showTimestamp) {
    formattedMessage += `[${new Date().toISOString()}] `;
  }
  
  formattedMessage += message;
  return formattedMessage;
};

/**
 * Log a debug message
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const debug = (message, data) => {
  if (config.minLevel <= LOG_LEVELS.DEBUG) {
    const formattedMessage = formatMessage(message);
    if (data !== undefined) {
      console.debug(formattedMessage, data);
    } else {
      console.debug(formattedMessage);
    }
  }
};

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const info = (message, data) => {
  if (config.minLevel <= LOG_LEVELS.INFO) {
    const formattedMessage = formatMessage(message);
    if (data !== undefined) {
      console.info(formattedMessage, data);
    } else {
      console.info(formattedMessage);
    }
  }
};

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const warn = (message, data) => {
  if (config.minLevel <= LOG_LEVELS.WARN) {
    const formattedMessage = formatMessage(message);
    if (data !== undefined) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }
};

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const error = (message, data) => {
  if (config.minLevel <= LOG_LEVELS.ERROR) {
    const formattedMessage = formatMessage(message);
    if (data !== undefined) {
      console.error(formattedMessage, data);
    } else {
      console.error(formattedMessage);
    }
  }
};

/**
 * Group related log messages
 * @param {string} label - Group label
 * @param {Function} callback - Function containing grouped log calls
 */
export const group = (label, callback) => {
  if (config.minLevel <= LOG_LEVELS.DEBUG) {
    console.group(formatMessage(label));
    callback();
    console.groupEnd();
  } else {
    callback();
  }
};

/**
 * Log a message with a specific level
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const log = (level, message, data) => {
  switch (level.toUpperCase()) {
    case 'DEBUG':
      debug(message, data);
      break;
    case 'INFO':
      info(message, data);
      break;
    case 'WARN':
      warn(message, data);
      break;
    case 'ERROR':
      error(message, data);
      break;
    default:
      info(message, data);
  }
};

export default {
  configure,
  debug,
  info,
  warn,
  error,
  group,
  log,
  LOG_LEVELS
};
