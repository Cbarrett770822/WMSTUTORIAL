import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, Divider, Alert, CircularProgress } from '@mui/material';
import { loadPresentations, savePresentations, AUTH_TOKEN_KEY } from '../../services/storageService';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPresentations, selectPresentations, selectPresentationsStatus } from '../../features/presentations/presentationsSlice';

/**
 * A debug component to test the Presentations API functionality
 */
const PresentationsApiDebugger = () => {
  const dispatch = useDispatch();
  const presentations = useSelector(selectPresentations);
  const status = useSelector(selectPresentationsStatus);
  
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);
  const [directApiResponse, setDirectApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:3001/api/getPresentations');

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
        } else if (parts.length === 1) {
          // Simple token format: userId:username:role
          const simpleParts = storedToken.split(':');
          if (simpleParts.length === 3) {
            setUserId(simpleParts[0]);
            setUsername(simpleParts[1]);
            setRole(simpleParts[2]);
          }
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

  const handleTestLoadPresentations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedPresentations = await loadPresentations();
      setApiResponse({
        success: true,
        message: `Loaded ${loadedPresentations.length} presentations from storageService`,
        presentations: loadedPresentations,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
      setApiResponse({
        success: false,
        message: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSavePresentations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const testPresentations = [
        {
          id: 'test-presentation-1',
          title: 'Test Presentation 1',
          description: 'A test presentation created for API testing',
          url: 'https://example.com/test-presentation.pptx',
          type: 'online',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      const result = await savePresentations(testPresentations);
      setApiResponse({
        success: result,
        message: result ? 'Presentations saved successfully' : 'Failed to save presentations',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchPresentationsRedux = () => {
    try {
      setError(null);
      dispatch(fetchPresentations());
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
    }
  };

  const handleTestApiEndpoint = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/test');
      const data = await response.json();
      setDirectApiResponse(data);
    } catch (err) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPresentationsEndpoint = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!token) {
        setError('No authentication token available');
        return;
      }
      
      console.log(`Testing presentations endpoint with token: ${token.substring(0, 10)}...`);
      const response = await fetch('http://localhost:3001/api/getPresentations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      setDirectApiResponse(data);
    } catch (err) {
      console.error('Error testing presentations endpoint:', err);
      setError(err.message || 'Unknown error occurred');
      setDirectApiResponse(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test the API endpoint with a specific URL
  const handleTestApiUrl = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!apiUrl) {
        setError('Please enter an API URL to test');
        return;
      }
      
      console.log(`Testing API URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: token ? {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('API response data:', data);
      setDirectApiResponse({
        status: response.status,
        statusText: response.statusText,
        data,
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
      <Typography variant="h4" gutterBottom>Presentations API Debugger</Typography>
      <Typography variant="body1" paragraph>
        This tool helps debug authentication and API issues with the Presentations API.
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
          <Button variant="contained" onClick={handleTestLoadPresentations}>
            Test Load Presentations
          </Button>
          <Button variant="contained" onClick={handleTestSavePresentations}>
            Test Save Presentations
          </Button>
          <Button variant="contained" onClick={handleFetchPresentationsRedux}>
            Fetch via Redux
          </Button>
          <Button variant="contained" onClick={handleTestApiEndpoint}>
            Test API Endpoint
          </Button>
          <Button variant="contained" onClick={handleTestPresentationsEndpoint}>
            Test Presentations API
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
            placeholder="http://localhost:3001/api/getPresentations"
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
        
        {presentations && presentations.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
            <Typography variant="h6" gutterBottom>Redux Presentations State:</Typography>
            <Typography variant="body2" gutterBottom>Status: {status}</Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(presentations, null, 2)}
            </pre>
          </Paper>
        )}
      </Box>
    </Paper>
  );
};

export default PresentationsApiDebugger;
