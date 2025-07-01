/**
 * Authentication Service
 * 
 * This service handles user authentication, session management,
 * and integrates with the unified settings service.
 */

import { hashPassword, verifyPassword } from '../../utils/passwordUtils';
import { loadProcesses, loadPresentations, loadProcessesSync, loadPresentationsSync } from '../storageService';
import * as unifiedSettingsService from '../settings/unifiedSettingsService';
import config from '../../config';
import { shouldUseDevelopmentFallbacks, isDevelopmentEnvironment } from '../../utils/environmentUtils';
import { processApiResponse, logDiagnostics, handleApiError } from '../../utils/apiResponseUtils';
import { 
  extractTokenFromHeader, 
  parseToken, 
  isTokenExpired, 
  getUserInfoFromToken,
  storeToken,
  removeToken,
  getStoredToken
} from '../../utils/tokenHandlingUtils';

// Constants
const STORAGE_KEY = 'wms_users';
const CURRENT_USER_KEY = 'wms_current_user';
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Initialize users from database
export const initializeUsers = async () => {
  try {
    // Get the authentication token
    const token = getStoredToken();
    
    if (!token) {
      console.warn('No authentication token available for user initialization');
      return { success: false, message: 'Authentication required' };
    }
    
    // Fetch users from API
    const response = await fetch(`${config.apiUrl}/.netlify/functions/getUsers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const responseData = await response.json();
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the API response
    const processedResponse = processApiResponse(responseData, 'users', []);
    
    if (processedResponse.success) {
      // Store users in local storage
      if (Array.isArray(processedResponse.data)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: processedResponse.data }));
      } else if (processedResponse.data?.users && Array.isArray(processedResponse.data.users)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: processedResponse.data.users }));
      } else {
        console.warn('Unexpected users data format:', processedResponse.data);
        // Store empty array as fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: [] }));
      }
      
      return { 
        success: true, 
        message: processedResponse.message || 'Users initialized successfully',
        users: processedResponse.data?.users || processedResponse.data || []
      };
    } else {
      console.error('API returned error:', processedResponse.message);
      return { 
        success: false, 
        message: processedResponse.message || 'Failed to initialize users'
      };
    }
  } catch (error) {
    console.error('Error initializing users:', error);
    return { 
      success: false, 
      message: `Failed to initialize users: ${error.message}`
    };
  }
};

export const getUsers = async () => {
  try {
    // Try to get users from localStorage first for quick access
    const usersJson = localStorage.getItem(STORAGE_KEY);
    let cachedUsers = [];
    
    if (usersJson) {
      try {
        const parsed = JSON.parse(usersJson);
        const users = parsed.users || parsed;
        if (Array.isArray(users) && users.length > 0) {
          cachedUsers = users;
        }
      } catch (parseError) {
        console.error('Error parsing cached users:', parseError);
      }
    }
    
    // Get the authentication token
    const token = getStoredToken();
    
    if (!token) {
      console.warn('No authentication token available, using cached users');
      return { success: true, users: cachedUsers, source: 'cache' };
    }
    
    // Try to fetch fresh data from the API
    try {
      // Ensure we're using the correct endpoint format
      const getUsersUrl = `${config.apiUrl}/.netlify/functions/getUsers`;
      console.log('Fetching users from API:', getUsersUrl);
      const response = await fetch(getUsersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('API response data:', responseData);
      logDiagnostics(responseData);
      
      // Handle different response formats
      if (Array.isArray(responseData)) {
        // Direct array of users
        console.log('API returned direct array of users');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: responseData }));
        return { success: true, users: responseData };
      }
      // Response with users array
      else if (responseData.users && Array.isArray(responseData.users)) {
        console.log('API returned object with users array');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: responseData.users }));
        return { success: true, users: responseData.users };
      }
      // Try to extract users from any response format
      else {
        console.log('Attempting to extract users from response');
        // Try processing with utility function as fallback
        const processedResponse = processApiResponse(responseData, 'users', cachedUsers);
        
        if (processedResponse.success && Array.isArray(processedResponse.users)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: processedResponse.users }));
          return processedResponse;
        } else if (processedResponse.data && Array.isArray(processedResponse.data)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: processedResponse.data }));
          return { success: true, users: processedResponse.data };
        }
      }
    } catch (apiError) {
      console.error('Error fetching users from API:', apiError);
    }
    
    // If API fetch failed or returned no data, use cached data
    return { success: true, users: cachedUsers, source: 'cache' };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, users: [], error: error.message };
  }
};

// Synchronous version for internal use when we need immediate access
export const getUsersSync = () => {
  try {
    const usersJson = localStorage.getItem(STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson).users || [] : [];
  } catch (error) {
    console.error('Error getting users synchronously:', error);
    return [];
  }
};

/**
 * Get a user by username
 * @param {string} username - Username to look up
 * @returns {Promise<Object>} - Object with success status, message, and user data
 */
export const getUserByUsername = async (username) => {
  try {
    // First try to get from API if we have a token
    const token = getStoredToken();
    
    if (token) {
      try {
        const response = await fetch(`${config.apiUrl}/.netlify/functions/getUser/${username}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const responseData = await response.json();
        logDiagnostics(responseData);
        
        const processedResponse = processApiResponse(responseData, 'user', null);
        
        if (processedResponse.success && processedResponse.data) {
          return {
            success: true,
            message: 'User found',
            user: processedResponse.data.user || processedResponse.data
          };
        }
      } catch (apiError) {
        console.warn(`API error getting user ${username}:`, apiError);
        // Fall back to local cache
      }
    }
    
    // Fall back to local cache
    const users = await getUsers();
    const user = users.find(user => user.username === username);
    
    if (user) {
      return {
        success: true,
        message: 'User found in local cache',
        user
      };
    }
    
    return {
      success: false,
      message: `User ${username} not found`,
      user: null
    };
  } catch (error) {
    console.error(`Error getting user by username ${username}:`, error);
    return {
      success: false,
      message: `Error retrieving user: ${error.message}`,
      user: null
    };
  }
};

/**
 * Logout the current user
 * @returns {Promise<boolean>} Success status
 */
export const logoutUser = async () => {
  try {
    // Before logging out, save current application state for the user
    const currentUser = getCurrentUser();
    const token = getStoredToken();
    
    if (currentUser) {
      console.log('Saving user data before logout for user ID:', currentUser.id);
      
      // Use the unified settings service to handle logout
      try {
        await unifiedSettingsService.handleUserLogout();
        console.log('Settings saved before logout');
      } catch (settingsError) {
        console.error('Error handling settings during logout:', settingsError);
        // Continue with logout even if settings saving fails
      }
    }
    
    // Revoke token on server if available
    if (token) {
      try {
        const response = await fetch(`${config.apiUrl}/.netlify/functions/revoke-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const responseData = await response.json();
        logDiagnostics(responseData);
        
        const processedResponse = processApiResponse(responseData, 'logout', null);
        
        if (processedResponse.success) {
          console.log('Token revoked on server successfully');
        } else {
          console.warn('Failed to revoke token on server:', processedResponse.message);
        }
      } catch (revokeError) {
        console.warn('Error revoking token on server:', revokeError);
        // Continue with logout even if token revocation fails
      }
    }
    
    // Clear auth token and user data
    removeToken();
    localStorage.removeItem(CURRENT_USER_KEY);
    
    // Clear session
    clearSession();
    
    console.log('User logged out successfully');
    
    // Dispatch an event to notify the app that the user has logged out
    window.dispatchEvent(new CustomEvent('user-logout'));
    
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Try to clean up anyway
    try {
      removeToken();
      localStorage.removeItem(CURRENT_USER_KEY);
      clearSession();
    } catch (cleanupError) {
      console.error('Error during logout cleanup:', cleanupError);
    }
    
    return {
      success: false,
      message: `Logout error: ${error.message}`
    };
  }
};

/**
 * Authenticate a user with username and password
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Promise<Object>} Authentication result
 */
export const authenticateUser = async (username, password) => {
  // Use the imported function to check development environment
  const isDevelopment = isDevelopmentEnvironment();
  const disableFallback = config?.development?.disableFallback === true || process.env.DISABLE_DEV_FALLBACK === 'true';
  
  console.log('Authenticating user:', username, 'in environment:', isDevelopment ? 'development' : 'production');
  console.log('Development fallback disabled:', disableFallback ? 'yes' : 'no');
  console.log('Should use development fallbacks:', shouldUseDevelopmentFallbacks() ? 'yes' : 'no');
  
  // Default users for development fallback
  const defaultUsers = ['admin', 'user', 'supervisor'];
  const defaultRoles = {
    'admin': ROLES.ADMIN, 
    'user': ROLES.USER, 
    'supervisor': ROLES.ADMIN  // Map supervisor to admin role
  };
  
  // Check for development fallback first to avoid unnecessary network requests
  // Only use fallback if it's not disabled
  if (isDevelopment && !disableFallback && defaultUsers.includes(username) && password === 'password') {
    console.log(`Using development fallback for ${username} authentication (fast path)`);
    const userId = `${username}-dev-id`;
    const token = `${userId}:${username}:${defaultRoles[username] || 'user'}`;
    const user = {
      id: userId,
      username: username,
      role: defaultRoles[username] || 'user'
    };
    
    // Store the token in localStorage
    storeToken(token);
    
    // Store user data in localStorage
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    // Create a new session
    createSession(user);
    
    // Initialize user settings if needed
    try {
      await unifiedSettingsService.initSettings();
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
    
    return {
      success: true,
      message: `Login successful for ${username} (DEV FALLBACK)`,
      token,
      user
    };
  }
  
  try {
    console.log(`Authenticating user: ${username}`);
    
    // First try to authenticate with the database
    try {
      // Make API call to authenticate
      const loginUrl = `${config.apiUrl.replace(/\/api$/, '')}/.netlify/functions/login`;
      console.log('Attempting login with URL:', loginUrl);
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      // Parse the response
      const responseData = await response.json();
      
      // Log diagnostics if available
      logDiagnostics(responseData);
      
      // Process the API response
      const processedResponse = processApiResponse(responseData, 'auth', null);
      
      if (processedResponse.success) {
        // Authentication was successful
        const token = processedResponse.data?.token || responseData.token;
        const user = processedResponse.data?.user || responseData.user;
        
        if (token && user) {
          console.log('Authentication successful via API');
          
          // Ensure the user has an ID (convert _id to id if needed)
          if (!user.id && user._id) {
            console.log('Converting _id to id for consistency');
            user.id = user._id;
          }
          
          // Store the token in localStorage
          storeToken(token);
          
          // Store user data in localStorage
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          
          // Create a new session
          createSession(user);
          
          // Initialize user settings if needed
          try {
            await unifiedSettingsService.initSettings();
            
            // Try to load user-specific settings
            if (user.id) {
              try {
                const { handleUserLogin } = await import('../unifiedSettingsService');
                await handleUserLogin(user.id);
                console.log('Loaded settings for user:', user.id);
              } catch (settingsError) {
                console.error('Error loading user settings:', settingsError);
              }
            }
          } catch (error) {
            console.error('Error initializing settings:', error);
          }
          
          return {
            success: true,
            user,
            token,
            message: processedResponse.message || 'Authentication successful'
          };
        } else {
          console.error('Authentication response missing token or user data');
          return {
            success: false,
            message: processedResponse.message || 'Authentication successful but data is missing'
          };
        }
      } else {
        // Authentication failed
        console.error('Authentication failed:', processedResponse.message);
        return {
          success: false,
          message: processedResponse.message || 'Authentication failed: Invalid credentials'
        };
      }
    } catch (apiError) {
      console.error('API authentication error:', apiError);
      console.warn('Trying fallback authentication...');
    }
    
    // If we're in development mode and the API call failed, try to authenticate with local data
    if (shouldUseDevelopmentFallbacks()) {
      console.log('Using development fallback for authentication');
      
      // Get users from localStorage
      const users = getUsersSync();
      
      // Find the user with the matching username
      const user = users.find(u => u.username === username);
      
      if (!user) {
        console.error(`User not found: ${username}`);
        return {
          success: false,
          message: 'Authentication failed: User not found'
        };
      }
      
      // Check if the password is correct
      const isPasswordValid = await verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        console.error('Invalid password');
        return {
          success: false,
          message: 'Authentication failed: Invalid credentials'
        };
      }
      
      console.log('Authentication successful via fallback');
      
      // Create a simple token for development purposes
      const token = `dev-token-${user.id}-${Date.now()}`;
      
      // Store the token in localStorage
      storeToken(token);
      
      // Store user data in localStorage
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      // Create a new session
      createSession(user);
      
      // Initialize user settings if needed
      try {
        await unifiedSettingsService.initSettings();
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
      
      return {
        success: true,
        user,
        token,
        message: 'Authentication successful (development fallback)'
      };
    } else {
      console.error('Authentication failed and no fallback available');
      return {
        success: false,
        message: 'Authentication failed: Service unavailable'
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: `Authentication error: ${error.message}`
    };
  }
};

export const addUser = async (newUser) => {
  try {
    // Get the authentication token
    const token = getStoredToken();
    
    if (!token) {
      console.error('No authentication token available');
      return {
        success: false,
        message: 'Authentication required to add user'
      };
    }
    
    console.log('Adding user with data:', { ...newUser, password: '[REDACTED]' });
    console.log('API URL:', `${config.apiUrl}/add-user`);
    
    // Add user to the database
    const response = await fetch(`${config.apiUrl}/.netlify/functions/add-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newUser)
    });
    
    console.log('Add user response status:', response.status);
    
    const responseData = await response.json();
    console.log('Add user response data:', responseData);
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the API response
    const processedResponse = processApiResponse(responseData, 'user', null);
    
    if (processedResponse.success) {
      // Update local cache if we have user data
      if (processedResponse.data?.user) {
        try {
          const users = await getUsers();
          users.push(processedResponse.data.user);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ users }));
        } catch (cacheError) {
          console.error('Error updating user cache:', cacheError);
          // Continue even if cache update fails
        }
      }
      
      return {
        success: true,
        message: processedResponse.message || 'User added successfully',
        user: processedResponse.data?.user || null
      };
    } else {
      return {
        success: false,
        message: processedResponse.message || 'Failed to add user'
      };
    }
  } catch (error) {
    console.error('Error adding user:', error);
    return { 
      success: false, 
      message: `Failed to add user: ${error.message}`
    };
  }
};

export const updateUser = async (username, updates) => {
  try {
    // Get the authentication token
    const token = getStoredToken();
    
    if (!token) {
      console.error('No authentication token available');
      return {
        success: false,
        message: 'Authentication required to update user'
      };
    }
    
    console.log('Updating user:', username);
    console.log('With updates:', { ...updates, password: updates.password ? '[REDACTED]' : undefined });
    console.log('API URL:', `${config.apiUrl}/update-user`);
    
    // Update user in the database
    const response = await fetch(`${config.apiUrl}/.netlify/functions/update-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, updates })
    });
    
    console.log('Update user response status:', response.status);
    
    const responseData = await response.json();
    console.log('Update user response data:', responseData);
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the API response
    const processedResponse = processApiResponse(responseData, 'user', null);
    
    if (processedResponse.success) {
      // Update local cache
      try {
        const users = await getUsers();
        const index = users.findIndex(user => user.username === username);
        if (index !== -1) {
          // Get the updated user from the response or apply the updates to the existing user
          const updatedUser = processedResponse.data?.user || { ...users[index], ...updates };
          users[index] = updatedUser;
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ users }));
        }
      } catch (cacheError) {
        console.error('Error updating user cache:', cacheError);
        // Continue even if cache update fails
      }
      
      return {
        success: true,
        message: processedResponse.message || 'User updated successfully',
        user: processedResponse.data?.user || null
      };
    } else {
      return {
        success: false,
        message: processedResponse.message || 'Failed to update user'
      };
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return { 
      success: false, 
      message: `Failed to update user: ${error.message}`
    };
  }
};

export const deleteUser = async (username) => {
  try {
    // Get the authentication token
    const token = getStoredToken();
    
    if (!token) {
      console.error('No authentication token available');
      return {
        success: false,
        message: 'Authentication required to delete user'
      };
    }
    
    // Delete user from the database
    const response = await fetch(`${config.apiUrl}/.netlify/functions/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });
    
    const responseData = await response.json();
    
    // Log diagnostics if available
    logDiagnostics(responseData);
    
    // Process the API response
    const processedResponse = processApiResponse(responseData, 'user', null);
    
    if (processedResponse.success) {
      // Update local cache
      try {
        const users = await getUsers();
        const filteredUsers = users.filter(user => user.username !== username);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: filteredUsers }));
      } catch (cacheError) {
        console.error('Error updating user cache after deletion:', cacheError);
        // Continue even if cache update fails
      }
      
      return {
        success: true,
        message: processedResponse.message || 'User deleted successfully'
      };
    } else {
      return {
        success: false,
        message: processedResponse.message || 'Failed to delete user'
      };
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return { 
      success: false, 
      message: `Failed to delete user: ${error.message}`
    };
  }
};

/**
 * Get the current authenticated user
 * @returns {Object|null} - Current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  try {
    // First check if we have a user in localStorage
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
    
    // If no user in localStorage but we have a token, try to extract user info from token
    const token = getStoredToken();
    if (token) {
      try {
        const userInfo = getUserInfoFromToken(token);
        if (userInfo && userInfo.username) {
          // Store the user info in localStorage for future use
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
          return userInfo;
        }
      } catch (tokenError) {
        console.error('Error extracting user info from token:', tokenError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get the current user session
 * @returns {Object|null} - Current session object or null if not found
 */
export const getCurrentSession = () => {
  try {
    const sessionJson = localStorage.getItem('wms_session');
    return sessionJson ? JSON.parse(sessionJson) : null;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};

/**
 * Create a new user session
 * @param {Object} user - User object to create session for
 * @param {number} [expirationHours=24] - Session expiration time in hours
 * @returns {Object} - Created session object
 */
export const createSession = (user, expirationHours = 24) => {
  try {
    if (!user) {
      console.error('Cannot create session: No user provided');
      return null;
    }
    
    const now = new Date();
    // Calculate session expiration time
    const expiresAt = now.getTime() + (expirationHours * 60 * 60 * 1000);
    
    // Ensure user ID is consistent (handle both id and _id formats)
    const userId = user.id || user._id;
    
    if (!userId) {
      console.error('Cannot create session: User has no ID');
      return null;
    }
    
    const session = {
      userId,
      username: user.username,
      role: user.role,
      createdAt: now.getTime(),
      expiresAt
    };
    
    localStorage.setItem('wms_session', JSON.stringify(session));
    console.log(`Session created for user ${user.username} (${userId})`);
    
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
};

/**
 * Clear the current user session
 * @returns {boolean} - True if session was cleared, false if no session existed
 */
export const clearSession = () => {
  try {
    const hadSession = !!localStorage.getItem('wms_session');
    localStorage.removeItem('wms_session');
    if (hadSession) {
      console.log('User session cleared successfully');
    }
    return hadSession;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
};

/**
 * Check if the current session is valid
 * @returns {boolean} - True if session is valid, false otherwise
 */
export const isSessionValid = () => {
  try {
    const session = getCurrentSession();
    
    if (!session) {
      return false;
    }
    
    // Check if session has required fields
    if (!session.userId || !session.expiresAt) {
      console.warn('Invalid session format detected');
      return false;
    }
    
    // Check if session is expired
    const now = new Date().getTime();
    const isExpired = session.expiresAt <= now;
    
    if (isExpired) {
      console.warn('Session has expired', {
        expiresAt: new Date(session.expiresAt).toISOString(),
        now: new Date(now).toISOString()
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};

/**
 * Check if a user is currently authenticated
 * @returns {Object} - Authentication status object with success property
 */
export const isAuthenticated = async () => {
  try {
    const token = getStoredToken();
    const currentUser = getCurrentUser();
    const session = getCurrentSession();
    
    // Check if token is valid and not expired
    const isTokenValid = token && !isTokenExpired(token);
    
    // User is authenticated if all three conditions are met:
    // 1. Has a valid token that's not expired
    // 2. Has current user data
    // 3. Has a valid session
    const isAuth = isTokenValid && !!currentUser && isSessionValid();
    
    if (isAuth) {
      return {
        success: true,
        message: 'User is authenticated',
        user: currentUser
      };
    } else {
      let reason = '';
      if (!token) reason = 'No token found';
      else if (isTokenExpired(token)) reason = 'Token is expired';
      else if (!currentUser) reason = 'No user data found';
      else if (!isSessionValid()) reason = 'Session is invalid';
      
      return {
        success: false,
        message: `User is not authenticated: ${reason}`
      };
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return {
      success: false,
      message: `Authentication check failed: ${error.message}`
    };
  }
};

/**
 * Check for and fix inconsistent authentication state
 * This can happen if the token exists but user data is missing
 * @returns {Object} - Result with success status and message
 */
export const checkAndFixAuthState = async () => {
  const token = getStoredToken();
  const currentUser = getCurrentUser();
  const session = getCurrentSession();
  
  console.log('Checking auth state consistency...');
  
  // Case 1: If we have a token but no user data, we're in an inconsistent state
  if (token && !currentUser) {
    console.warn('Inconsistent auth state detected: Token exists but no user data');
    // Clear the token since we can't determine the user
    removeToken();
    // Also clear session if it exists
    if (session) clearSession();
    return {
      success: true,
      message: 'Fixed inconsistent auth state: Removed invalid token',
      fixed: true,
      issue: 'token_without_user'
    };
  }
  
  // Case 2: If we have user data but no token, also inconsistent
  if (!token && currentUser) {
    console.warn('Inconsistent auth state detected: User data exists but no token');
    
    // Before clearing user data, ensure settings are preserved using the unified service
    try {
      // The unified settings service will handle preserving settings
      // during authentication state changes
      await unifiedSettingsService.saveSettings(unifiedSettingsService.loadSettings());
    } catch (error) {
      console.error('Error saving settings during auth state fix:', error);
    }
    
    // Clear the user data
    localStorage.removeItem(CURRENT_USER_KEY);
    // Also clear session if it exists
    if (session) clearSession();
    return {
      success: true,
      message: 'Fixed inconsistent auth state: Removed user data without token',
      fixed: true,
      issue: 'user_without_token'
    };
  }
  
  // Case 3: If we have a token and user data but session is invalid or missing
  if (token && currentUser && (!session || !isSessionValid())) {
    console.warn('Inconsistent auth state detected: Valid token and user data but invalid session');
    
    // Create a new session to fix the issue
    createSession(currentUser);
    console.log('Created new session to fix auth state inconsistency');
    return {
      success: true,
      message: 'Fixed inconsistent auth state: Created new session',
      fixed: true,
      issue: 'invalid_session'
    };
  }
  
  // Case 4: Check if token is expired
  if (token && isTokenExpired(token)) {
    console.warn('Auth state issue: Token is expired');
    // Remove expired token
    removeToken();
    // Also clear user data and session
    localStorage.removeItem(CURRENT_USER_KEY);
    clearSession();
    return {
      success: true,
      message: 'Fixed auth state: Removed expired token and associated data',
      fixed: true,
      issue: 'expired_token'
    };
  }
  
  // Case 5: Initialize settings if needed
  if (token && currentUser && session) {
    try {
      // Use the unified settings service to ensure settings are properly loaded
      await unifiedSettingsService.initSettings();
    } catch (error) {
      console.error('Error checking settings consistency:', error);
    }
  }
  
  console.log('Auth state is consistent');
  return {
    success: true,
    message: 'Auth state is consistent',
    fixed: false
  }; // No issues found
};

/**
 * Load user-specific settings from localStorage
 * @param {string} userId - User ID to load settings for
 * @returns {Object|null} - User settings object or null if not found
 */
export const loadUserSettings = (userId) => {
  try {
    if (!userId) {
      console.error('Cannot load user settings: No user ID provided');
      return null;
    }
    
    const userSettingsKey = `wms_user_settings_${userId}`;
    const userSettingsJson = localStorage.getItem(userSettingsKey);
    
    if (!userSettingsJson) {
      console.log(`No settings found for user ID: ${userId}`);
      return null;
    }
    
    const userSettings = JSON.parse(userSettingsJson);
    console.log(`Loaded settings for user ID: ${userId}`, userSettings);
    return userSettings;
  } catch (error) {
    console.error(`Error loading settings for user ID: ${userId}`, error);
    return null;
  }
};

/**
 * Save user-specific settings to localStorage
 * @param {string} userId - User ID to save settings for
 * @param {Object} data - Settings data to save
 * @returns {boolean} - True if successful, false otherwise
 */
export const saveUserSettings = (userId, data) => {
  try {
    if (!userId) {
      console.error('Cannot save user settings: No user ID provided');
      return false;
    }
    
    if (!data) {
      console.error('Cannot save user settings: No data provided');
      return false;
    }
    
    const userSettingsKey = `wms_user_settings_${userId}`;
    localStorage.setItem(userSettingsKey, JSON.stringify({
      ...data,
      lastSaved: new Date().toISOString()
    }));
    
    console.log(`Saved settings for user ID: ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error saving settings for user ID: ${userId}`, error);
    return false;
  }
};

/**
 * Get user from localStorage by token
 * @returns {Object|null} - User object or null if not found
 */
export const getUserFromStorage = () => {
  return getCurrentUser();
};
