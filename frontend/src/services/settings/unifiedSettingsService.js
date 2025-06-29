/**
 * Unified Settings Service
 * 
 * Provides centralized settings management functions for user preferences
 * and application configuration. Handles both local storage and server-side
 * settings synchronization.
 */

import { saveUserSettings as saveRemoteUserSettings } from '../auth/authService';
import { log } from '../logService';

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'light',
  notifications: true,
  dashboardLayout: 'grid',
  language: 'en',
  itemsPerPage: 10
};

/**
 * Load settings from local storage with optional fallback to defaults
 * @param {boolean} useDefaults - Whether to use default settings if none found
 * @returns {Object} The loaded settings
 */
export const loadSettings = async (useDefaults = true) => {
  try {
    const settingsJson = localStorage.getItem('userSettings');
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return useDefaults ? DEFAULT_SETTINGS : null;
  } catch (error) {
    log('error', 'Failed to load settings from local storage', { error });
    return useDefaults ? DEFAULT_SETTINGS : null;
  }
};

/**
 * Save settings to local storage
 * @param {Object} settings - Settings to save
 * @param {boolean} merge - Whether to merge with existing settings
 * @returns {Object} The saved settings
 */
export const saveSettings = async (settings, merge = true) => {
  try {
    let newSettings = settings;
    
    if (merge) {
      const currentSettings = await loadSettings();
      newSettings = { ...currentSettings, ...settings };
    }
    
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    return newSettings;
  } catch (error) {
    log('error', 'Failed to save settings to local storage', { error });
    return null;
  }
};

/**
 * Load user settings from server and sync with local storage
 * @param {string} userId - User ID
 * @returns {Object} The loaded user settings
 */
export const loadUserSettings = async (userId) => {
  try {
    // This function should be imported from authService
    // but we're avoiding circular dependencies
    const response = await fetch(`/api/get-user-settings?userId=${userId}`, {
      headers: {
        'Authorization': localStorage.getItem('token') || ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load user settings: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.settings) {
      await saveSettings(data.settings, true);
      return data.settings;
    }
    
    return null;
  } catch (error) {
    log('error', 'Failed to load user settings from server', { error, userId });
    return null;
  }
};

/**
 * Save user settings to server
 * @param {string} userId - User ID
 * @param {Object} settings - Settings to save
 * @returns {boolean} Success status
 */
export const saveUserSettings = async (userId, settings) => {
  try {
    const result = await saveRemoteUserSettings(userId, settings);
    return result.success;
  } catch (error) {
    log('error', 'Failed to save user settings to server', { error, userId });
    return false;
  }
};

/**
 * Get current theme from settings
 * @returns {string} Current theme ('light' or 'dark')
 */
export const getTheme = () => {
  try {
    const settingsJson = localStorage.getItem('userSettings');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      return settings.theme || 'light';
    }
    return 'light';
  } catch (error) {
    log('error', 'Failed to get theme from settings', { error });
    return 'light';
  }
};

/**
 * Set theme in settings
 * @param {string} theme - Theme to set ('light' or 'dark')
 * @returns {boolean} Success status
 */
export const setTheme = (theme) => {
  try {
    const settingsJson = localStorage.getItem('userSettings');
    let settings = {};
    
    if (settingsJson) {
      settings = JSON.parse(settingsJson);
    }
    
    settings.theme = theme;
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    return true;
  } catch (error) {
    log('error', 'Failed to set theme in settings', { error });
    return false;
  }
};

/**
 * Initialize settings service
 * @returns {Object} Settings initialization result
 */
export const initSettings = async () => {
  try {
    // Load settings from local storage
    const settings = await loadSettings(true);
    
    // Apply theme if available
    if (settings && settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    
    log('info', 'Settings service initialized', { settings });
    return { success: true, settings };
  } catch (error) {
    log('error', 'Failed to initialize settings service', { error });
    return { success: false, error: error.message };
  }
};

/**
 * Handle user logout - save settings before logout
 * @param {Object} user - User object
 * @returns {boolean} Success status
 */
export const handleUserLogout = async (user) => {
  try {
    if (!user || !user.id) return true;
    
    const settings = await loadSettings(false);
    if (settings) {
      await saveUserSettings(user.id, { settings });
    }
    
    return true;
  } catch (error) {
    log('error', 'Failed to handle user logout settings sync', { error });
    return false;
  }
};

/**
 * Handle user login - load user-specific settings
 * @param {string} userId - User ID
 * @returns {Object} The loaded user settings
 */
export const handleUserLogin = async (userId) => {
  try {
    if (!userId) {
      log('warn', 'No user ID provided for loading user settings');
      return await initSettings();
    }
    
    // Load user settings from server
    const userSettings = await loadUserSettings(userId);
    
    // If no user settings found, use default settings
    if (!userSettings) {
      return await initSettings();
    }
    
    log('info', 'User settings loaded successfully', { userId });
    return userSettings;
  } catch (error) {
    log('error', 'Failed to handle user login settings sync', { error, userId });
    return await initSettings();
  }
};
