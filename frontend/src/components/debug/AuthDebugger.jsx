import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemText,
  TextField,
  CircularProgress
} from '@mui/material';
import { 
  selectIsAuthenticated, 
  selectCurrentUser, 
  selectIsAdmin,
  selectIsSupervisor
} from '../../features/auth/authSlice';
import { getUsers } from '../../services/auth/authService';
import { fetchProcesses } from '../../features/processes/processesSlice';
import { fetchPresentations } from '../../features/presentations/presentationsSlice';
import config from '../../config';

const AuthDebugger = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isSupervisor = useSelector(selectIsSupervisor);
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [testResponse, setTestResponse] = useState(null);
  
  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('auth_token');
    setToken(storedToken || 'No token found');
    
    // Get API URL from config
    setApiUrl(config.apiUrl);
    
    // Collect debug info
    const info = {
      environment: process.env.NODE_ENV,
      apiUrl: config.apiUrl,
      developmentSettings: config.development,
      localStorage: {
        authToken: !!localStorage.getItem('auth_token'),
        currentUser: !!localStorage.getItem('current_user'),
        processes: !!localStorage.getItem('wms_processes'),
        presentations: !!localStorage.getItem('wms_presentations')
      }
    };
    setDebugInfo(info);
  }, []);
  
  const handleTestUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      console.log('Users API result:', result);
      if (Array.isArray(result)) {
        setUsers(result);
      } else if (result && result.users && Array.isArray(result.users)) {
        setUsers(result.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestProcesses = () => {
    setLoading(true);
    dispatch(fetchProcesses())
      .unwrap()
      .then(result => {
        console.log('Processes result:', result);
        setTestResponse({ type: 'processes', data: result });
      })
      .catch(error => {
        console.error('Error fetching processes:', error);
        setTestResponse({ type: 'processes', error });
      })
      .finally(() => setLoading(false));
  };
  
  const handleTestPresentations = () => {
    setLoading(true);
    dispatch(fetchPresentations())
      .unwrap()
      .then(result => {
        console.log('Presentations result:', result);
        setTestResponse({ type: 'presentations', data: result });
      })
      .catch(error => {
        console.error('Error fetching presentations:', error);
        setTestResponse({ type: 'presentations', error });
      })
      .finally(() => setLoading(false));
  };
  
  const handleTestEndpoint = async (endpoint) => {
    setLoading(true);
    try {
      const url = `${config.apiUrl.replace(/\/api$/, '')}/.netlify/functions/${endpoint}`;
      console.log(`Testing endpoint: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log(`${endpoint} response:`, data);
      setTestResponse({ type: endpoint, data, status: response.status });
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error);
      setTestResponse({ type: endpoint, error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Authentication Debugger</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Authentication State</Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Is Authenticated" secondary={isAuthenticated ? 'Yes' : 'No'} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Is Admin" secondary={isAdmin ? 'Yes' : 'No'} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Is Supervisor" secondary={isSupervisor ? 'Yes' : 'No'} />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Current User" 
              secondary={currentUser ? 
                `ID: ${currentUser.id}, Username: ${currentUser.username}, Role: ${currentUser.role}` : 
                'No user'
              } 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Token" 
              secondary={token ? `${token.substring(0, 20)}...` : 'No token'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="API URL" secondary={apiUrl} />
          </ListItem>
        </List>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Test API Endpoints</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleTestUsers}
            disabled={loading}
          >
            Test Users API
          </Button>
          <Button 
            variant="contained" 
            onClick={handleTestProcesses}
            disabled={loading}
          >
            Test Processes API
          </Button>
          <Button 
            variant="contained" 
            onClick={handleTestPresentations}
            disabled={loading}
          >
            Test Presentations API
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => handleTestEndpoint('get-users')}
            disabled={loading}
          >
            Test get-users
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleTestEndpoint('getProcesses')}
            disabled={loading}
          >
            Test getProcesses
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleTestEndpoint('getPresentations')}
            disabled={loading}
          >
            Test getPresentations
          </Button>
        </Box>
        
        {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Paper>
      
      {users.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Users ({users.length})</Typography>
          <List dense>
            {users.map((user, index) => (
              <ListItem key={index}>
                <ListItemText 
                  primary={user.username} 
                  secondary={`Role: ${user.role}, ID: ${user.id || user._id}`} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      {testResponse && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Response: {testResponse.type}
            {testResponse.status && ` (Status: ${testResponse.status})`}
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5', p: 2 }}>
            <pre>{JSON.stringify(testResponse.data || testResponse.error, null, 2)}</pre>
          </Box>
        </Paper>
      )}
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Debug Information</Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5', p: 2 }}>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </Box>
      </Paper>
    </Box>
  );
};

export default AuthDebugger;
