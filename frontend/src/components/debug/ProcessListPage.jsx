import React, { useEffect, useState } from 'react';
import { AUTH_TOKEN_KEY } from '../../services/storageService';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * ProcessListPage component
 * Simple page that lists all processes with their steps and URLs
 */
const ProcessListPage = () => {
  const [processes, setProcesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch processes directly from API on component mount
  useEffect(() => {
    const fetchProcessesDirectly = async () => {
      setIsLoading(true);
      try {
        // Get token from localStorage using the constant
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const apiUrl = `/.netlify/functions/getProcesses?t=${timestamp}`;
        
        // Make direct API call
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Processes fetched directly:', data);
        
        // Save to state
        setProcesses(data.processes || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching processes:', err);
        setError(err.message);
        setProcesses([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProcessesDirectly();
  }, []);
  
  // Group processes by category
  const processCategories = {};
  if (processes && processes.length > 0) {
    processes.forEach(process => {
      const category = process.category || 'Uncategorized';
      if (!processCategories[category]) {
        processCategories[category] = [];
      }
      processCategories[category].push(process);
    });
  }
  
  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Process List
      </Typography>
      <Typography variant="body1" paragraph>
        This page displays all processes with their steps and video URLs. Use this to verify the current data in the database.
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
          <Typography color="error">Error loading processes: {error}</Typography>
        </Paper>
      ) : !processes || processes.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography>No processes found in the database.</Typography>
        </Paper>
      ) : (
        <Box>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Total Processes: {processes.length}
          </Typography>
          
          {/* Display processes by category */}
          {Object.keys(processCategories).map(category => (
            <Paper key={category} sx={{ mt: 3, mb: 2, p: 2 }}>
              <Typography variant="h5" gutterBottom>
                {category} ({processCategories[category].length} processes)
              </Typography>
              
              {processCategories[category].map(process => (
                <Accordion key={process.id || process._id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {process.title || process.name || 'Untitled Process'} 
                      <Typography component="span" sx={{ fontWeight: 'normal', ml: 1 }} color="text.secondary">
                        (ID: {process.id || process._id})
                      </Typography>
                    </Typography>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Box>
                      <Typography variant="subtitle2">Process Details:</Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Title" 
                            secondary={process.title || 'No title'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Name" 
                            secondary={process.name || 'No name'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Category" 
                            secondary={process.category || 'No category'} 
                          />
                        </ListItem>
                      </List>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        Steps ({process.steps?.length || 0}):
                      </Typography>
                      
                      {!process.steps || process.steps.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No steps defined for this process.</Typography>
                      ) : (
                        <List sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          {process.steps.map((step, index) => (
                            <ListItem key={step.id || index} divider>
                              <Box sx={{ width: '100%' }}>
                                <Typography variant="subtitle2">
                                  Step {index + 1}: {step.title || 'Untitled Step'}
                                </Typography>
                                
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" component="div">
                                    <strong>Description:</strong> {step.description || 'No description'}
                                  </Typography>
                                  
                                  <Typography variant="body2" component="div" sx={{ mt: 1, wordBreak: 'break-all' }}>
                                    <strong>Video URL:</strong> {
                                      step.videoUrl ? (
                                        <Link 
                                          href={step.videoUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          sx={{ display: 'block', ml: 2 }}
                                        >
                                          {step.videoUrl}
                                        </Link>
                                      ) : 'No video URL'
                                    }
                                  </Typography>
                                </Box>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProcessListPage;
