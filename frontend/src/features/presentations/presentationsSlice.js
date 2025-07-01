import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AUTH_TOKEN_KEY } from '../../services/storageService';
import { savePresentationsToApi } from '../../services/apiService';
import config from '../../config';

// Async thunk for fetching presentations from the API
export const fetchPresentations = createAsyncThunk(
  'presentations/fetchPresentations',
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      // Check if user is authenticated from Redux state
      const isAuthenticated = getState().auth.isAuthenticated;
      console.log('fetchPresentations: isAuthenticated =', isAuthenticated);
      
      if (!isAuthenticated) {
        console.log('User not authenticated, cannot load presentations');
        // Return empty array without making API call
        return [];
      }
      
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log('fetchPresentations: token exists =', !!token);
      if (!token) {
        console.log('No authentication token found, cannot load presentations');
        return [];
      }

      // Log the API URL and token format for debugging
      // Add cache-busting timestamp to prevent caching
      const timestamp = new Date().getTime();
      const presentationsUrl = `${config.apiUrl.replace(/\/api$/, '')}/.netlify/functions/getPresentations?_=${timestamp}`;
      console.log('Making API request to:', presentationsUrl);
      console.log(`Using token: ${token.substring(0, 10)}...`);
      
      const response = await fetch(presentationsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.presentations)) {
        console.log(`Loaded ${data.presentations.length} presentations from API`);
        return data.presentations;
      } else {
        console.warn('API returned success but no presentations array:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching presentations:', error);
      return rejectWithValue(error.message || 'Failed to fetch presentations');
    }
  }
);

// Async thunk for saving presentations to MongoDB
export const savePresentationsToDatabase = createAsyncThunk(
  'presentations/savePresentationsToDatabase',
  async (presentations, { rejectWithValue, getState }) => {
    try {
      const isAuthenticated = getState().auth.isAuthenticated;
      
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping database save');
        return presentations;
      }
      
      console.log('Saving presentations to MongoDB:', presentations);
      const result = await savePresentationsToApi(presentations);
      console.log('Save result:', result);
      return presentations;
    } catch (error) {
      console.error('Error saving presentations to database:', error);
      return rejectWithValue(error.message || 'Failed to save presentations to database');
    }
  }
);

// Async thunk for adding a presentation
export const addPresentationAsync = createAsyncThunk(
  'presentations/addPresentationAsync',
  async (presentation, { dispatch, getState }) => {
    // First add to local state
    dispatch(addPresentation(presentation));
    
    // Then save all presentations to database
    const allPresentations = getState().presentations.presentations;
    await dispatch(savePresentationsToDatabase(allPresentations));
    
    // Fetch presentations from the backend to ensure UI is refreshed with latest data
    await dispatch(fetchPresentations());
    
    return presentation;
  }
);

// Async thunk for updating a presentation
export const updatePresentationAsync = createAsyncThunk(
  'presentations/updatePresentationAsync',
  async ({id, changes}, { dispatch, getState }) => {
    // First update local state
    dispatch(updatePresentation({id, changes}));
    
    // Then save all presentations to database
    const allPresentations = getState().presentations.presentations;
    await dispatch(savePresentationsToDatabase(allPresentations));
    
    // Fetch presentations from the backend to ensure UI is refreshed with latest data
    await dispatch(fetchPresentations());
    
    return {id, changes};
  }
);

// Async thunk for deleting a presentation
export const deletePresentationAsync = createAsyncThunk(
  'presentations/deletePresentationAsync',
  async (id, { dispatch, getState }) => {
    // First delete from local state
    dispatch(deletePresentation(id));
    
    // Then save all presentations to database
    const allPresentations = getState().presentations.presentations;
    await dispatch(savePresentationsToDatabase(allPresentations));
    
    // Fetch presentations from the backend to ensure UI is refreshed with latest data
    await dispatch(fetchPresentations());
    
    return id;
  }
);

// Ensure presentations is always an array
const ensureArray = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
};

// No default presentations - always load from API
const defaultPresentations = [];

// Initialize with empty array - always load from API
const initialState = {
  presentations: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  saveStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  saveError: null,
  initialized: false, // Track if we've loaded initial data
  skipSave: false // Flag to control whether changes should be saved to backend
};

export const presentationsSlice = createSlice({
  name: 'presentations',
  initialState,
  reducers: {
    // Initialize data by marking as initialized - actual data will come from API
    initializePresentationsData: (state) => {
      // Only mark as initialized if we haven't already
      if (!state.initialized) {
        // Set skipSave to true to prevent saving back to API
        state.skipSave = true;
        
        // Don't load any data here, just mark as initialized
        // Data will be loaded from API via fetchPresentations thunk
        console.log('Presentations initialized - will fetch from API');
        
        state.initialized = true;
      }
    },
    updatePresentations: (state, action) => {
      state.presentations = action.payload;
      // No localStorage saving - data is only stored in Redux state
    },
    addPresentation: (state, action) => {
      state.presentations.push(action.payload);
      
      // Always save user-initiated changes
      savePresentations(state.presentations);
    },
    updatePresentation: (state, action) => {
      const { id, changes } = action.payload;
      const index = state.presentations.findIndex(p => p.id === id);
      if (index !== -1) {
        // Update only the fields provided in the changes object
        state.presentations[index] = { ...state.presentations[index], ...changes };
        
        // Always save user-initiated changes
        savePresentations(state.presentations);
      }
    },
    deletePresentation: (state, action) => {
      state.presentations = state.presentations.filter(p => p.id !== action.payload);
      
      // Always save user-initiated changes
      savePresentations(state.presentations);
    },
    
    // Action to set the skipSave flag
    setSkipSave: (state, action) => {
      state.skipSave = action.payload;
      console.log('Setting skipSave to:', action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresentations.pending, (state) => {
        state.status = 'loading';
        // Set skipSave to true before loading data from API
        state.skipSave = true;
      })
      .addCase(fetchPresentations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Always update presentations with whatever the API returned, even if empty
        state.presentations = Array.isArray(action.payload) ? action.payload : [];
        // Don't save to localStorage anymore
        try {
          // Clear localStorage to ensure we're not using cached data
          localStorage.removeItem(PRESENTATIONS_KEY);
        } catch (error) {
          console.error('Error clearing presentations from localStorage:', error);
        }
        // Keep skipSave true until explicitly changed
      })
      .addCase(fetchPresentations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        // Reset skipSave flag
        state.skipSave = false;
        
        // Don't show error in console for authentication issues
        if (action.payload === 'No authentication token found' || 
            (typeof action.payload === 'string' && action.payload.includes('401')) ||
            (action.error?.message && typeof action.error.message === 'string' && action.error.message.includes('401'))) {
          console.log('Authentication required for fetching presentations');
        } else {
          console.error('Error fetching presentations:', action.payload || action.error.message);
        }
      })
      // Handle savePresentationsToDatabase actions
      .addCase(savePresentationsToDatabase.pending, (state) => {
        state.saveStatus = 'loading';
      })
      .addCase(savePresentationsToDatabase.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded';
        console.log('Successfully saved presentations to database');
      })
      .addCase(savePresentationsToDatabase.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload || action.error.message;
        console.error('Failed to save presentations to database:', action.payload || action.error.message);
      });
  }
});

export const { 
  initializePresentationsData,
  updatePresentations,
  addPresentation,
  updatePresentation,
  deletePresentation,
  setSkipSave
} = presentationsSlice.actions;

// Explicitly export setSkipSave for components that import it directly
export const setSkipSaveAction = setSkipSave;

// Ensure data is always an array
const ensureArrayResult = (data) => {
  return Array.isArray(data) ? data : [];
};

// Selectors
export const selectPresentations = (state) => ensureArrayResult(state.presentations.presentations);
export const selectPresentationsStatus = (state) => state.presentations.status;
export const selectPresentationsError = (state) => state.presentations.error;

export default presentationsSlice.reducer;
