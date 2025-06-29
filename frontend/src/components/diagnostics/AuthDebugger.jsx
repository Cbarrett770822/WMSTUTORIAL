import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { 
  selectIsAuthenticated, 
  selectCurrentUser, 
  selectIsAdmin, 
  selectIsSupervisor 
} from '../../features/auth/authSlice';
import { ROLES } from '../../services/auth/authService';

const AuthDebugger = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isSupervisor = useSelector(selectIsSupervisor);

  return (
    <Paper sx={{ p: 3, mb: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Authentication Debugger</Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">Authentication Status:</Typography>
        <Typography color={isAuthenticated ? 'success.main' : 'error.main'}>
          {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">Current User:</Typography>
        {currentUser ? (
          <Box component="pre" sx={{ 
            p: 2, 
            bgcolor: 'grey.100', 
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: 200
          }}>
            {JSON.stringify(currentUser, null, 2)}
          </Box>
        ) : (
          <Typography color="error.main">No user data available</Typography>
        )}
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">Role Information:</Typography>
        <Typography>
          User Role: <strong>{currentUser?.role || 'None'}</strong>
        </Typography>
        <Typography>
          Is Admin: <strong>{isAdmin ? 'Yes' : 'No'}</strong>
        </Typography>
        <Typography>
          Is Supervisor: <strong>{isSupervisor ? 'Yes' : 'No'}</strong>
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">Available Roles:</Typography>
        <Box component="pre" sx={{ 
          p: 2, 
          bgcolor: 'grey.100', 
          borderRadius: 1
        }}>
          {JSON.stringify(ROLES, null, 2)}
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">Role Check Logic:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {`
// Admin check:
state.auth.isAuthenticated && state.auth.user?.role === 'admin'

// Supervisor check:
state.auth.isAuthenticated && 
(state.auth.user?.role === 'admin' || state.auth.user?.role === 'supervisor')
          `}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AuthDebugger;
