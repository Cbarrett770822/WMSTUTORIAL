import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  authenticateUser as loginApi,
  logoutUser as logoutService,
  getCurrentUser,
  getUserFromStorage,
  isAuthenticated,
  checkAndFixAuthState
} from '../../services/auth/authService';

// Selectors will be defined after the slice to avoid circular references

// Check if there's an active session
const checkInitialSession = () => {
  // We'll do a basic check here and let the async checkAuthState handle the full check
  const user = getCurrentUser();
  const isAuth = !!user;
  
  return {
    isAuthenticated: isAuth,
    user: user || null,
    error: null,
    loading: false
  };
};

const initialState = checkInitialSession();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
    },
    logout: (state) => {
      // Use the logout service to clear token and user data
      // We'll handle the async logout in the component
      // This is just for updating the Redux state
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const { loginSuccess, loginFailure, logout, clearError, setLoading } = authSlice.actions;

// Async thunks
export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, { dispatch }) => {
    try {
      const response = await logoutService();
      dispatch(logout());
      return response;
    } catch (error) {
      console.error('Error during logout:', error);
      // Still dispatch logout to clean up the Redux state
      dispatch(logout());
      return { success: false, message: error.message || 'Logout failed' };
    }
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const authResult = await loginApi(username, password);
      
      // Check if login was successful
      if (authResult.success) {
        // Login successful, dispatch success action with user data
        dispatch(loginSuccess(authResult.user));
        return { success: true, user: authResult.user };
      } else {
        // Login failed, dispatch failure action with error message
        dispatch(loginFailure(authResult.message || 'Login failed'));
        return rejectWithValue({ success: false, error: authResult.message });
      }
    } catch (error) {
      // Exception occurred, dispatch failure action with error message
      const errorMessage = error.message || 'An unexpected error occurred';
      dispatch(loginFailure(errorMessage));
      return rejectWithValue({ success: false, error: errorMessage });
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Thunk for checking current user
export const checkAuthState = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    // Check for and fix any inconsistent auth state
    try {
      const authResult = await checkAndFixAuthState();
      if (authResult.wasFixed) {
        console.log('Fixed inconsistent authentication state during checkAuthState:', authResult.message);
      }
    } catch (authCheckError) {
      console.error('Error checking auth state consistency:', authCheckError);
    }
    
    // Check if the user is authenticated
    const authCheck = await isAuthenticated();
    
    if (authCheck && authCheck.success) {
      const user = await getCurrentUser();
      if (user) {
        dispatch(loginSuccess(user));
        
        // Ensure settings are loaded for this user
        // This helps with persistence issues
        const { loadSettings, saveSettings } = require('../../services/storageService');
        const { loadUserSettings, saveUserSettings } = require('../../services/auth/authService');
        
        const userId = user.id || user._id;
        console.log('Loading settings for authenticated user:', userId);
        
        try {
          // First try to load user-specific settings from auth storage
          const userSettings = await loadUserSettings(userId);
          
          if (userSettings && userSettings.settings) {
            console.log('Found saved settings in auth storage');
            // Save to global settings for consistency
            await saveSettings(userSettings.settings, true);
          } else {
            // If no user-specific settings, try loading from global settings
            const settings = await loadSettings(true);
            console.log('Loaded settings during auth check');
            
            if (settings) {
              // Save to user-specific storage for future use
              await saveUserSettings(userId, { settings });
            }
          }
        } catch (settingsError) {
          console.error('Error handling user settings during auth check:', settingsError);
        }
      } else {
        console.warn('No user found despite successful auth check');
        dispatch(logoutAsync());
      }
    } else {
      console.log('User is not authenticated:', authCheck.message);
      dispatch(logoutAsync());
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    dispatch(logoutAsync());
  } finally {
    dispatch(setLoading(false));
  }
};

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectUser = (state) => state.auth.user; // Alias for selectCurrentUser for backward compatibility
export const selectAuthError = (state) => state.auth.error;
export const selectIsLoading = (state) => state.auth.loading;
export const selectIsAdmin = (state) => 
  state.auth.isAuthenticated && 
  (state.auth.user?.role?.toLowerCase() === 'admin');
// For backward compatibility, supervisor is now treated as admin
export const selectIsSupervisor = (state) => 
  state.auth.isAuthenticated && 
  (state.auth.user?.role?.toLowerCase() === 'admin');

export default authSlice.reducer;
