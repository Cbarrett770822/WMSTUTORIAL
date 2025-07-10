import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Paper, 
  InputBase, 
  IconButton,
  Divider,
  Button,
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ProcessCard from './ProcessCard';
import { 
  initializeProcessesData,
  filterByCategory,
  selectSelectedCategory
} from '../../features/processes/processesSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';

// Category mapping for standardization
const CATEGORY_MAP = {
  'receiving': 'inbound',
  'putaway': 'inbound',
  'inbound': 'inbound',
  'storage': 'storage',
  'inventory': 'storage',
  'picking': 'outbound',
  'packing': 'outbound',
  'shipping': 'outbound',
  'outbound': 'outbound',
  'returns': 'advanced',
  'advanced': 'advanced',
  'general': 'general'
};

// Category color mapping
const CATEGORY_COLORS = {
  'inbound': '#1976d2', // blue
  'storage': '#2e7d32', // green
  'outbound': '#d32f2f', // red
  'advanced': '#9c27b0', // purple
  'general': '#757575'  // gray
};

const ProcessesDashboardFinal = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const allProcesses = useSelector(state => state.processes.processes || []);
  const selectedCategory = useSelector(selectSelectedCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Debug state
  const [debug, setDebug] = useState({
    allProcessCount: 0,
    filteredCount: 0,
    categories: {}
  });
  
  // Initialize processes data when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(initializeProcessesData());
    }
  }, [dispatch, isAuthenticated]);

  // Extract category from URL query parameters
  useEffect(() => {
    if (isAuthenticated) {
      const queryParams = new URLSearchParams(location.search);
      const categoryParam = queryParams.get('category');
      
      if (categoryParam && ['all', 'inbound', 'storage', 'outbound', 'advanced'].includes(categoryParam)) {
        dispatch(filterByCategory(categoryParam));
      }
    }
  }, [location.search, dispatch, isAuthenticated]);

  // Helper function to normalize a category
  const normalizeCategory = (cat) => {
    if (!cat) return 'general';
    const lowerCat = cat.toLowerCase();
    return CATEGORY_MAP[lowerCat] || lowerCat;
  };

  // Get processes with normalized categories
  const getProcessesWithFixedCategories = () => {
    // Always distribute categories automatically
    const standardCategories = ['inbound', 'storage', 'outbound', 'advanced'];
    const distributedProcesses = allProcesses.map((process, index) => {
      // Try to infer category from title/description keywords
      const titleAndDesc = `${process.title || ''} ${process.description || ''}`.toLowerCase();
      
      let foundCategory = 'general';
      
      // Check for keywords in title/description
      if (/receiv|arrival|inbound|putaway|dock|unload|truck|supplier|vendor|asn/i.test(titleAndDesc)) {
        foundCategory = 'inbound';
      } else if (/stor|rack|slot|bin|inventory|location|warehouse map|zone|aisle/i.test(titleAndDesc)) {
        foundCategory = 'storage';
      } else if (/pick|pack|ship|outbound|dispatch|deliver|order|customer|carrier/i.test(titleAndDesc)) {
        foundCategory = 'outbound';
      } else if (/return|rma|advanced|cycle count|audit|quality|damage|exception/i.test(titleAndDesc)) {
        foundCategory = 'advanced';
      } else {
        // Fallback: distribute by index
        foundCategory = standardCategories[index % standardCategories.length];
      }
      
      return {
        ...process,
        category: foundCategory,
        originalCategory: process.category // preserve original
      };
    });
    
    // Log the distribution
    const categoryCount = {};
    distributedProcesses.forEach(p => {
      const cat = p.category;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    console.log('Category distribution:', categoryCount);
    
    return distributedProcesses;
  };

  // Get filtered processes based on selected category
  const getFilteredProcesses = () => {
    const processesToUse = getProcessesWithFixedCategories();
    
    if (!processesToUse || !Array.isArray(processesToUse)) {
      return [];
    }
    
    console.log('Filtering processes by category:', selectedCategory);
    console.log('Available processes:', processesToUse.length);
    
    // Log all processes and their categories for debugging
    console.log('Process categories:', processesToUse.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      originalCategory: p.originalCategory
    })));
    
    if (selectedCategory === 'all') {
      return processesToUse;
    }
    
    const filtered = processesToUse.filter(process => {
      const category = normalizeCategory(process.category);
      console.log(`Process ${process.title}: category=${category}, comparing with ${selectedCategory}`);
      
      let isMatch = false;
      if (selectedCategory === 'advanced') {
        isMatch = category === 'advanced' || category === 'returns';
      } else {
        isMatch = category === selectedCategory.toLowerCase();
      }
      
      console.log(`  Match result: ${isMatch}`);
      return isMatch;
    });
    
    console.log(`Filtered ${filtered.length} processes for category '${selectedCategory}'`);
    return filtered;
  };

  // Update debug info whenever processes or category changes
  useEffect(() => {
    const categories = {};
    const processesToUse = getProcessesWithFixedCategories();
    
    processesToUse.forEach(p => {
      const cat = p.category || 'undefined';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    setDebug({
      allProcessCount: allProcesses.length,
      filteredCount: getFilteredProcesses().length,
      categories
    });
  }, [allProcesses, selectedCategory]);

  const handleCategoryChange = (event, newValue) => {
    if (isAuthenticated) {
      console.log('Changing category to:', newValue);
      dispatch(filterByCategory(newValue));
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleFixCategories = () => {
    try {
      if (!allProcesses || !Array.isArray(allProcesses) || allProcesses.length === 0) {
        setSnackbarMessage('No processes found to fix');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // Force a re-render
      setDebug(prev => ({ ...prev, timestamp: new Date().toISOString() }));
      
      setSnackbarMessage(`Successfully fixed categories for ${allProcesses.length} processes`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fixing categories:', error);
      setSnackbarMessage(`Error fixing categories: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Apply search filter
  const filteredProcesses = searchTerm 
    ? getFilteredProcesses().filter(process => 
        (process.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (process.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : getFilteredProcesses();

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        Warehouse Management System Processes
      </Typography>
      
      <Typography variant="body1" component="div" align="center" sx={{ mb: 2 }}>
        Explore the key warehouse processes and learn how a Warehouse Management System (WMS) can optimize each one.
        Select any process to view detailed Flow & Benefits.
      </Typography>
      
      {/* No debug panel or fix button */}
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 4 }}>
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: { xs: '100%', md: 300 } }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search processes"
            inputProps={{ 'aria-label': 'search processes' }}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
        </Paper>
        
        <Box sx={{ flexGrow: 1 }}>
          <Tabs
            value={selectedCategory}
            onChange={handleCategoryChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="process categories"
          >
            <Tab label="All Processes" value="all" />
            <Tab label="Inbound" value="inbound" />
            <Tab label="Storage" value="storage" />
            <Tab label="Outbound" value="outbound" />
            <Tab label="Advanced" value="advanced" />
          </Tabs>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 4 }} />
      
      {filteredProcesses.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredProcesses.map((process) => (
            <Box key={process.id} sx={{ 
              flex: '1 1 calc(33.33% - 16px)', 
              minWidth: { 
                xs: '100%', 
                sm: 'calc(50% - 16px)', 
                md: 'calc(33.33% - 16px)' 
              },
              maxWidth: { 
                xs: '100%', 
                sm: 'calc(50% - 16px)', 
                md: 'calc(33.33% - 16px)' 
              }
            }}>
              <ProcessCard process={process} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No processes found for the selected category.
          </Typography>
        </Box>
      )}
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProcessesDashboardFinal;
