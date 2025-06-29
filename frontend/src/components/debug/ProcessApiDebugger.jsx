import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, Divider, Alert, CircularProgress } from '@mui/material';
import { saveProcesses, loadProcesses, AUTH_TOKEN_KEY } from '../../services/storageService';
import config from '../../config';

/**
 * A debug component to test the Process API functionality
 */
const ProcessApiDebugger = () => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [directApiResponse, setDirectApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:3001/api/getProcesses');

  // Load token from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      
      // Try to parse JWT token
      try {
        const parts = storedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setUserId(payload.id || payload.userId || payload.sub || '');
          setUsername(payload.username || '');
          setRole(payload.role || '');
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  const handleSetToken = () => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      alert('Token saved to localStorage');
    }
  };

  const handleCreateTestToken = () => {
    // Create a simple test token (not a real JWT, just for testing)
    const testUserId = userId || 'test-user-123';
    const testUsername = username || 'testuser';
    const testRole = role || 'admin';
    
    // Format: userId:username:role
    const simpleToken = `${testUserId}:${testUsername}:${testRole}`;
    setToken(simpleToken);
    localStorage.setItem(AUTH_TOKEN_KEY, simpleToken);
    setUserId(testUserId);
    setUsername(testUsername);
    setRole(testRole);
    alert('Test token created and saved to localStorage');
  };

  const handleClearToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken('');
    setUserId('');
    setUsername('');
    setRole('');
    alert('Token cleared from localStorage');
  };

  const handleTestSaveProcesses = async () => {
    try {
      setError(null);
      const testProcesses = [
        {
          id: 'test-process-1',
          name: 'Test Process 1',
          description: 'A test process created for API testing',
          steps: [
            { id: 'step1', name: 'Step 1', description: 'First step' },
            { id: 'step2', name: 'Step 2', description: 'Second step' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      const result = await saveProcesses(testProcesses);
      setApiResponse({
        success: result,
        message: result ? 'Processes saved successfully' : 'Failed to save processes',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
    }
  };

  const handleTestLoadProcesses = async () => {
    try {
      setError(null);
      const loadedProcesses = await loadProcesses();
      setProcesses(loadedProcesses);
      setApiResponse({
        success: true,
        message: `Loaded ${loadedProcesses.length} processes`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
      setApiResponse({
        success: false,
        message: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleTestApiEndpoint = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/test');
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProcessesEndpoint = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setDirectApiResponse(null);
      
      // Get the authentication token
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log(`Testing processes endpoint with token: ${storedToken ? 'Token exists' : 'No token'}`);
      
      if (!storedToken) {
        setError('No authentication token found. Please create or set a token first.');
        return;
      }
      
      const response = await fetch(`${config.apiUrl}/.netlify/functions/getProcesses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        }
      });
      
      console.log(`API response status: ${response.status}`);
      
      const data = await response.json();
      setDirectApiResponse({
        status: response.status,
        statusText: response.statusText,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      if (response.ok && data.processes) {
        setProcesses(data.processes);
      }
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
      setDirectApiResponse({
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTestApiUrl = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setDirectApiResponse(null);
      
      // Get the authentication token
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log(`Testing custom URL: ${apiUrl}`);
      console.log(`Token exists: ${!!storedToken}`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`API response status: ${response.status}`);
      
      const data = await response.json();
      setDirectApiResponse({
        status: response.status,
        statusText: response.statusText,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
      setDirectApiResponse({
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>Process API Debugger</Typography>
      <Typography variant="body1" paragraph>
        This tool helps debug authentication and API issues with the Process API.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Authentication Token</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Current Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
          />
          <Button variant="contained" onClick={handleSetToken}>
            Save Token
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleCreateTestToken}>
            Create Test Token
          </Button>
          <Button variant="outlined" color="error" onClick={handleClearToken}>
            Clear Token
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>API Testing</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleTestSaveProcesses}>
            Test Save Processes
          </Button>
          <Button variant="contained" onClick={handleTestLoadProcesses}>
            Test Load Processes
          </Button>
          <Button variant="contained" onClick={handleTestApiEndpoint}>
            Test API Endpoint
          </Button>
          <Button variant="contained" onClick={handleTestProcessesEndpoint}>
            Test Processes API
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}>
          <TextField
            label="Custom API URL"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
            placeholder="http://localhost:3001/api/getProcesses"
          />
          <Button variant="contained" onClick={handleTestApiUrl}>
            Test Custom URL
          </Button>
        </Box>
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {apiResponse && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
            <Typography variant="h6" gutterBottom>Storage Service Response:</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </Paper>
        )}
        
        {directApiResponse && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
            <Typography variant="h6" gutterBottom>Direct API Response:</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(directApiResponse, null, 2)}
            </pre>
          </Paper>
        )}
        
        {processes.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>Loaded Processes:</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
              {JSON.stringify(processes, null, 2)}
            </pre>
          </Paper>
        )}
      </Box>
    </Paper>
  );
};

export default ProcessApiDebugger;
