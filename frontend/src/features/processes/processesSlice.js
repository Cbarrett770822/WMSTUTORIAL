import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadProcesses, saveProcesses, hasStoredProcesses, AUTH_TOKEN_KEY } from '../../services/storageService';
import { saveProcessesToApi } from '../../services/apiService';
import config from '../../config';

// Async thunk for fetching processes from the API
export const fetchProcesses = createAsyncThunk(
  'processes/fetchProcesses',
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      // Check if user is authenticated from Redux state
      const isAuthenticated = getState().auth.isAuthenticated;
      
      if (!isAuthenticated) {
        console.log('User not authenticated, using cached processes');
        // Return cached processes or default data without making API call
        const cachedProcesses = localStorage.getItem('wms_processes');
        return cachedProcesses ? JSON.parse(cachedProcesses) : [];
      }
      
      // Get the authentication token from localStorage
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        console.log('No authentication token found, using cached processes');
        const cachedProcesses = localStorage.getItem('wms_processes');
        return cachedProcesses ? JSON.parse(cachedProcesses) : [];
      }

      const processesUrl = `${config.apiUrl.replace(/\/api$/, '')}/.netlify/functions/getProcesses`;
      console.log('Fetching processes from API:', processesUrl);
      const response = await fetch(processesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const processesArray = Array.isArray(data.processes) ? data.processes : [];
      
      // Normalize processes to ensure they have titles
      const normalizedProcesses = normalizeProcesses(processesArray);
      
      // Update state with fetched processes
      return {
        processes: normalizedProcesses,
        source: data.source || 'api',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching processes:', error);
      return rejectWithValue(error.message || 'Failed to fetch processes');
    }
  }
);

// Async thunk for saving processes to MongoDB
export const saveProcessesToDatabase = createAsyncThunk(
  'processes/saveProcessesToDatabase',
  async (processes, { rejectWithValue, getState }) => {
    try {
      const isAuthenticated = getState().auth.isAuthenticated;
      
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping database save');
        return processes;
      }
      
      // Normalize all processes before saving to ensure they have title/name
      const normalizedProcesses = normalizeProcesses(processes);
      
      console.log('Saving normalized processes to MongoDB:', normalizedProcesses);
      const result = await saveProcessesToApi(normalizedProcesses);
      console.log('Save result:', result);
      return normalizedProcesses;
    } catch (error) {
      console.error('Error saving processes to database:', error);
      return rejectWithValue(error.message || 'Failed to save processes to database');
    }
  }
);

// Async thunk for adding a process
export const addProcessAsync = createAsyncThunk(
  'processes/addProcessAsync',
  async (process, { dispatch, getState }) => {
    // First add to local state
    dispatch(addProcess(process));
    
    // Then save all processes to database
    const allProcesses = getState().processes.processes;
    await dispatch(saveProcessesToDatabase(allProcesses));
    
    return process;
  }
);

// Async thunk for updating a process
export const updateProcessAsync = createAsyncThunk(
  'processes/updateProcessAsync',
  async ({id, changes}, { dispatch, getState }) => {
    // First update local state
    dispatch(updateProcess({id, changes}));
    
    // Then save all processes to database
    const allProcesses = getState().processes.processes;
    await dispatch(saveProcessesToDatabase(allProcesses));
    
    return {id, changes};
  }
);

// Async thunk for deleting a process
export const deleteProcessAsync = createAsyncThunk(
  'processes/deleteProcessAsync',
  async (id, { dispatch, getState }) => {
    // First delete from local state
    dispatch(deleteProcess(id));
    
    // Then save all processes to database
    const allProcesses = getState().processes.processes;
    await dispatch(saveProcessesToDatabase(allProcesses));
    
    return id;
  }
);

// Ensure processes is always an array
const ensureArray = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
};

// Ensure processes data is loaded properly
const ensureProcessesLoaded = async () => {
  try {
    if (hasStoredProcesses()) {
      const processes = await loadProcesses();
      if (Array.isArray(processes)) {
        return processes;
      }
    }
    return [];
  } catch (error) {
    console.error('Error loading processes:', error);
    return [];
  }
};

// Utility function to normalize process data
const normalizeProcess = (process) => {
  if (!process) return process;
  
  const normalized = { ...process };
  
  // Ensure title and name are synchronized
  if (!normalized.title && normalized.name) {
    normalized.title = normalized.name;
  } else if (!normalized.name && normalized.title) {
    normalized.name = normalized.title;
  } else if (!normalized.title && !normalized.name) {
    // Generate a default title if both are missing
    const category = normalized.category || 'general';
    const shortId = (normalized.id || normalized._id || '').slice(-6);
    const defaultTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} Process ${shortId}`;
    normalized.title = defaultTitle;
    normalized.name = defaultTitle;
  }
  
  return normalized;
};

// Utility function to normalize an array of processes
const normalizeProcesses = (processes) => {
  if (!processes) return [];
  if (!Array.isArray(processes)) return [];
  return processes.map(normalizeProcess);
};

// Initialize with empty array instead of loading data automatically
const initialState = {
  processes: [],
  selectedProcessId: null,
  selectedCategory: 'all',
  currentStep: 0,
  isVideoPlaying: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  saveStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  saveError: null,
  initialized: false // Track if we've loaded initial data
};

export const processesSlice = createSlice({
  name: 'processes',
  initialState,
  reducers: {
    // New reducer to initialize data only when explicitly requested
    initializeProcessesData: (state) => {
      // Mark as initialized to prevent multiple initializations
      if (!state.initialized) {
        state.initialized = true;
        state.status = 'loading';
      }
    },
    selectProcess: (state, action) => {
      state.selectedProcessId = action.payload;
      state.currentStep = 0;
      state.isVideoPlaying = false;
    },
    clearSelectedProcess: (state) => {
      state.selectedProcessId = null;
      state.currentStep = 0;
      state.isVideoPlaying = false;
    },
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    nextStep: (state) => {
      const selectedProcess = state.processes.find(p => 
        (p.id === state.processes.selectedProcessId) || 
        (p._id === state.processes.selectedProcessId)
      );
      if (state.selectedProcessId && selectedProcess && state.currentStep < (selectedProcess.steps?.length || 0) - 1) {
        state.currentStep += 1;
      }
    },
    previousStep: (state) => {
      // We only need to check if currentStep > 0, no need to find the process
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
    setVideoPlaying: (state, action) => {
      state.isVideoPlaying = action.payload;
    },
    filterByCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    updateProcesses: (state, action) => {
      state.processes = action.payload;
      // Save to localStorage and database since this is an explicit update
      saveProcesses(action.payload, true);
    },
    addProcess: (state, action) => {
      // Normalize the process before adding it
      const normalizedProcess = normalizeProcess(action.payload);
      state.processes.push(normalizedProcess);
      // Save to localStorage and database since this is a user action
      saveProcesses(state.processes, true);
    },
    updateProcess: (state, action) => {
      const { id, changes } = action.payload;
      const index = state.processes.findIndex(p => p.id === id);
      if (index !== -1) {
        // Update only the fields provided in the changes object
        const updatedProcess = { ...state.processes[index], ...changes };
        // Normalize the updated process
        state.processes[index] = normalizeProcess(updatedProcess);
        // Save to localStorage and database since this is a user edit
        saveProcesses(state.processes, true);
      }
    },
    deleteProcess: (state, action) => {
      state.processes = state.processes.filter(p => p.id !== action.payload);
      // If the deleted process was selected, clear the selection
      if (state.selectedProcessId === action.payload) {
        state.selectedProcessId = null;
        state.currentStep = 0;
      }
      // Save to localStorage and database since this is a user deletion
      saveProcesses(state.processes, true);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcesses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProcesses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Only update processes if we got data from the API
        if (action.payload && action.payload.processes) {
          // Normalize processes to ensure they have titles
          const normalizedProcesses = normalizeProcesses(action.payload.processes);
          state.processes = normalizedProcesses;
          // Save to localStorage only (not to database) for offline access
          saveProcesses(normalizedProcesses, false);
        }
      })
      .addCase(fetchProcesses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        
        // Don't show error in console for authentication issues
        if (action.payload === 'No authentication token found' || 
            action.payload?.includes('401') ||
            action.error?.message?.includes('401')) {
          console.log('Authentication required for fetching processes');
        } else {
          console.error('Error fetching processes:', action.payload || action.error.message);
        }
      })
      // Handle saveProcessesToDatabase actions
      .addCase(saveProcessesToDatabase.pending, (state) => {
        state.saveStatus = 'loading';
      })
      .addCase(saveProcessesToDatabase.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded';
        console.log('Successfully saved processes to database');
      })
      .addCase(saveProcessesToDatabase.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload || action.error.message;
        console.error('Failed to save processes to database:', action.payload || action.error.message);
      });
  }
});

export const { 
  initializeProcessesData,
  selectProcess, 
  clearSelectedProcess, 
  setCurrentStep, 
  nextStep, 
  previousStep, 
  setVideoPlaying, 
  filterByCategory, 
  updateProcesses,
  addProcess,
  updateProcess,
  deleteProcess
} = processesSlice.actions;

// Ensure data is always an array
const ensureArrayResult = (data) => {
  return Array.isArray(data) ? data : [];
};

// Selectors
export const selectProcesses = (state) => ensureArrayResult(state.processes.processes);
export const selectAllProcesses = (state) => ensureArrayResult(state.processes.processes);
export const selectFilteredProcesses = (state) => {
  const category = state.processes.selectedCategory;
  if (category === 'all') {
    return ensureArrayResult(state.processes.processes);
  }
  
  // Handle both 'returns' and 'advanced' categories
  const processes = ensureArrayResult(state.processes.processes);
  
  if (category === 'returns' || category === 'advanced') {
    return processes.filter(process => 
      process.category === 'returns' || process.category === 'advanced'
    );
  }
  
  return processes.filter(process => process.category === category);
};
export const selectSelectedProcess = (state) => {
  const processes = ensureArrayResult(state.processes.processes);
  // First try to find by id, then by _id if id is not available
  return processes.find(process => 
    (process.id === state.processes.selectedProcessId) || 
    (process._id === state.processes.selectedProcessId)
  ) || null;
};
export const selectCurrentStep = (state) => state.processes.currentStep;
export const selectIsVideoPlaying = (state) => state.processes.isVideoPlaying;
export const selectSelectedCategory = (state) => state.processes.selectedCategory;
export const selectProcessesStatus = (state) => state.processes.status;
export const selectProcessesError = (state) => state.processes.error;

export default processesSlice.reducer;
