import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { saveProcesses, loadProcesses } from '../../services/storageService';

const ProcessApiDebugger = () => {
  const currentUser = useSelector(selectCurrentUser);
  const [userInfo, setUserInfo] = useState({});
  const [tokenInfo, setTokenInfo] = useState('');
  const [processes, setProcesses] = useState([]);
  const [saveResult, setSaveResult] = useState(null);
  const [loadResult, setLoadResult] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Get user info from localStorage
    try {
      const userJson = localStorage.getItem('wms_current_user');
      if (userJson) {
        setUserInfo(JSON.parse(userJson));
      }
      
      const token = localStorage.getItem('wms_auth_token');
      setTokenInfo(token || 'No token found');
      
      // Load initial processes
      handleLoadProcesses();
    } catch (err) {
      setError(`Error loading initial data: ${err.message}`);
    }
  }, []);
  
  const handleSaveProcesses = async () => {
    try {
      setError(null);
      setSaveResult('Saving...');
      
      // Create test processes if none exist
      const processesToSave = processes.length > 0 ? processes : [
        {
          id: 'test-process-1',
          name: 'Test Process 1',
          description: 'A test process created at ' + new Date().toISOString(),
          steps: [
            { id: 'step1', title: 'Step 1', description: 'First step' },
            { id: 'step2', title: 'Step 2', description: 'Second step' }
          ]
        },
        {
          id: 'test-process-2',
          name: 'Test Process 2',
          description: 'Another test process created at ' + new Date().toISOString(),
          steps: [
            { id: 'step1', title: 'Step 1', description: 'First step' }
          ]
        }
      ];
      
      // Save processes
      const result = await saveProcesses(processesToSave);
      setSaveResult(JSON.stringify(result, null, 2));
      setProcesses(processesToSave);
    } catch (err) {
      setError(`Error saving processes: ${err.message}`);
      setSaveResult(`Failed: ${err.message}`);
    }
  };
  
  const handleLoadProcesses = async () => {
    try {
      setError(null);
      setLoadResult('Loading...');
      
      // Load processes
      const result = await loadProcesses();
      setLoadResult(JSON.stringify(result, null, 2));
      
      if (result && Array.isArray(result)) {
        setProcesses(result);
      }
    } catch (err) {
      setError(`Error loading processes: ${err.message}`);
      setLoadResult(`Failed: ${err.message}`);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Process API Debugger</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">User Information</Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            <strong>Current User (Redux):</strong> {currentUser ? JSON.stringify(currentUser) : 'Not logged in'}
          </Typography>
          <Typography variant="body1">
            <strong>User from localStorage:</strong> {JSON.stringify(userInfo)}
          </Typography>
          <Typography variant="body1">
            <strong>Token:</strong> {tokenInfo ? `${tokenInfo.substring(0, 20)}...` : 'No token'}
          </Typography>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSaveProcesses}
        >
          Test Save Processes
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleLoadProcesses}
        >
          Test Load Processes
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">Save Result</Typography>
          <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            <pre>{saveResult || 'No save attempted yet'}</pre>
          </Box>
        </Paper>
        
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">Load Result</Typography>
          <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            <pre>{loadResult || 'No load attempted yet'}</pre>
          </Box>
        </Paper>
      </Box>
      
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6">Current Processes</Typography>
        {processes.length > 0 ? (
          <List>
            {processes.map(process => (
              <ListItem key={process.id} divider>
                <ListItemText
                  primary={process.name}
                  secondary={
                    <>
                      <Typography component="span" variant="body2">
                        {process.description}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2">
                        Steps: {process.steps ? process.steps.length : 0}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body1">No processes found</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ProcessApiDebugger;
