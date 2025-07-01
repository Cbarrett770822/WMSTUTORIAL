import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ExcelImportComponent from './ExcelImportComponent';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Divider,
  Button
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TableChartIcon from '@mui/icons-material/TableChart';
import { selectIsAdmin, selectIsAuthenticated } from '../../features/auth/authSlice';

const SettingsPage = () => {
  const navigate = useNavigate();
  const isAdmin = useSelector(selectIsAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
      // You could also show a snackbar message here
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  // Function to show notifications from child components
  const showNotification = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {isAdmin ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              WMS Data Management
            </Typography>
            <Typography variant="subtitle1" color="primary">
              Admin Mode
            </Typography>
          </Box>
          
          <Paper sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                WMS Data Import
              </Typography>
              <Typography variant="body2" paragraph color="text.secondary">
                Import data from Excel files. Select the data type, download the template, fill in your data, and upload the completed file.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ExcelImportComponent showNotification={showNotification} />
            </Box>
          </Paper>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="error" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body1" paragraph>
            This page is only accessible to administrators.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </Box>
      )}

      {isAdmin && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Imported data will be immediately available to all users with appropriate permissions.
            Make sure your Excel file follows the template format to avoid import errors.
          </Typography>
        </Alert>
      )}
      
      <Snackbar
        open={openSnackbar}
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

export default SettingsPage;
