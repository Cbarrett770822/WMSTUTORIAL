import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Paper, Card, CardContent, Divider } from '@mui/material';
import { selectUser, selectIsAdmin, selectIsSupervisor } from '../../features/auth/authSlice';

/**
 * Role Debugger Component
 * 
 * This component displays detailed information about the current user's role
 * and authentication state to help debug role-based access issues.
 */
const RoleDebugger = () => {
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isSupervisor = useSelector(selectIsSupervisor);
  
  // Get raw user data from localStorage for comparison
  const rawUserData = localStorage.getItem('wms_current_user');
  let parsedUserData = null;
  
  try {
    if (rawUserData) {
      parsedUserData = JSON.parse(rawUserData);
    }
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Role Debugger</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Authentication Status</Typography>
        <Typography>
          Is Admin (from selector): <strong>{isAdmin ? 'Yes' : 'No'}</strong>
        </Typography>
        <Typography>
          Is Supervisor (from selector): <strong>{isSupervisor ? 'Yes' : 'No'}</strong>
        </Typography>
      </Paper>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Redux User Data</Typography>
          {user ? (
            <Box component="pre" sx={{ 
              bgcolor: 'background.paper', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(user, null, 2)}
            </Box>
          ) : (
            <Typography color="error">No user data in Redux store</Typography>
          )}
        </CardContent>
      </Card>
      
      <Divider sx={{ my: 3 }} />
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>localStorage User Data</Typography>
          {parsedUserData ? (
            <Box component="pre" sx={{ 
              bgcolor: 'background.paper', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(parsedUserData, null, 2)}
            </Box>
          ) : (
            <Typography color="error">No user data in localStorage</Typography>
          )}
        </CardContent>
      </Card>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Note: If there's a discrepancy between Redux and localStorage data, 
          or if the role is not correctly recognized, there might be an issue with 
          case sensitivity or data format in the role detection logic.
        </Typography>
      </Box>
    </Box>
  );
};

export default RoleDebugger;
