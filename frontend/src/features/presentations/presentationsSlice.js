import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadPresentations, savePresentations, hasStoredPresentations, AUTH_TOKEN_KEY } from '../../services/storageService';
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
        console.log('User not authenticated, using cached presentations');
        // Return cached presentations without making API call
        return loadInitialPresentations();
      }
      
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log('fetchPresentations: token exists =', !!token);
      if (!token) {
        console.log('No authentication token found, using cached presentations');
        return loadInitialPresentations();
      }

      // Log the API URL and token format for debugging
      const presentationsUrl = `${config.apiUrl.replace(/\/api$/, '')}/.netlify/functions/getPresentations`;
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
    
    return id;
  }
);

// Ensure presentations is always an array
const ensureArray = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
};

// Load presentations from localStorage if available
const loadInitialPresentations = () => {
  try {
    if (hasStoredPresentations()) {
      const presentations = loadPresentations();
      if (Array.isArray(presentations)) {
        return presentations;
      }
    }
    return defaultPresentations;
  } catch (error) {
    console.error('Error loading initial presentations:', error);
    return defaultPresentations;
  }
};

// Default presentations if none are stored
const defaultPresentations = [
  {
    id: 1,
    title: 'WMS Introduction',
    url: 'https://wms-presentations.s3.amazonaws.com/wms-introduction.pptx',
    description: 'An introduction to Warehouse Management Systems and their benefits',
    isLocal: false
  },
  {
    id: 2,
    title: 'Inbound Processes',
    url: 'https://wms-presentations.s3.amazonaws.com/inbound-processes.pptx',
    description: 'Detailed overview of receiving and putaway processes',
    isLocal: false
  }
];

// Initialize with empty array instead of loading data automatically
const initialState = {
  presentations: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  saveStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  saveError: null,
  initialized: false // Track if we've loaded initial data
};

export const presentationsSlice = createSlice({
  name: 'presentations',
  initialState,
  reducers: {
    // New reducer to initialize data only when explicitly requested
    initializePresentationsData: (state) => {
      // Only initialize if not already done
      if (!state.initialized) {
        state.presentations = loadInitialPresentations();
        state.initialized = true;
      }
    },
    updatePresentations: (state, action) => {
      state.presentations = action.payload;
      // Save to localStorage
      savePresentations(action.payload);
    },
    addPresentation: (state, action) => {
      state.presentations.push(action.payload);
      // Save to localStorage
      savePresentations(state.presentations);
    },
    updatePresentation: (state, action) => {
      const { id, changes } = action.payload;
      const index = state.presentations.findIndex(p => p.id === id);
      if (index !== -1) {
        // Update only the fields provided in the changes object
        state.presentations[index] = { ...state.presentations[index], ...changes };
        // Save to localStorage
        savePresentations(state.presentations);
      }
    },
    deletePresentation: (state, action) => {
      state.presentations = state.presentations.filter(p => p.id !== action.payload);
      // Save to localStorage
      savePresentations(state.presentations);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresentations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPresentations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Only update presentations if we got data from the API
        if (Array.isArray(action.payload) && action.payload.length > 0) {
          state.presentations = action.payload;
          // Save to localStorage for offline access
          savePresentations(action.payload);
        }
      })
      .addCase(fetchPresentations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        
        // Don't show error in console for authentication issues
        if (action.payload === 'No authentication token found' || 
            action.payload?.includes('401') ||
            action.error?.message?.includes('401')) {
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
  deletePresentation
} = presentationsSlice.actions;

// Ensure data is always an array
const ensureArrayResult = (data) => {
  return Array.isArray(data) ? data : [];
};

// Selectors
export const selectPresentations = (state) => ensureArrayResult(state.presentations.presentations);
export const selectPresentationsStatus = (state) => state.presentations.status;
export const selectPresentationsError = (state) => state.presentations.error;

export default presentationsSlice.reducer;
