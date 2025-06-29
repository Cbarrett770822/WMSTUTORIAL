import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getUsers, addUser, updateUser, deleteUser, ROLES } from '../../services/auth/authService';
import { selectCurrentUser, selectIsAdmin, selectIsSupervisor } from '../../features/auth/authSlice';

const UserManagement = () => {
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isSupervisor = useSelector(selectIsSupervisor);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: ROLES.USER
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Log users state changes
  useEffect(() => {
    console.log('Users state changed:', users);
  }, [users]);

  // Load users on component mount
  useEffect(() => {
    console.log('UserManagement component mounted');
    console.log('Current auth state:', { 
      isAdmin, 
      isSupervisor, 
      currentUser: currentUser ? { 
        id: currentUser.id, 
        username: currentUser.username, 
        role: currentUser.role 
      } : null 
    });
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log('UserManagement: Starting to load users');
      console.log('Current auth state:', { 
        isAdmin, 
        isSupervisor, 
        currentUser: currentUser ? { 
          id: currentUser.id, 
          username: currentUser.username, 
          role: currentUser.role 
        } : null 
      });
      
      showSnackbar('Refreshing users from database...', 'info');
      
      // Clear localStorage cache first to ensure fresh data
      localStorage.removeItem('wms_users');
      
      const usersData = await getUsers();
      console.log('UserManagement: Received users data:', usersData);
      
      // Handle different response formats
      if (Array.isArray(usersData)) {
        // Direct array of users
        console.log('UserManagement: Setting users array directly:', usersData);
        setUsers(usersData);
        showSnackbar(`Users refreshed successfully: ${usersData.length} users found`, 'success');
      }
      // Response object with users array
      else if (usersData && typeof usersData === 'object') {
        if (usersData.users && Array.isArray(usersData.users)) {
          console.log('UserManagement: Setting users from object with users array:', usersData.users);
          setUsers(usersData.users);
          showSnackbar(`Users refreshed successfully: ${usersData.users.length} users found`, 'success');
        } 
        else if (usersData.data && Array.isArray(usersData.data)) {
          console.log('UserManagement: Setting users from data property:', usersData.data);
          setUsers(usersData.data);
          showSnackbar(`Users refreshed successfully: ${usersData.data.length} users found`, 'success');
        }
        else {
          console.error('Unexpected users data format:', usersData);
          showSnackbar('Error loading users: Unexpected data format', 'error');
          
          // Try to extract any array from the response as a last resort
          const possibleArrays = Object.values(usersData).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            const largestArray = possibleArrays.reduce((a, b) => a.length > b.length ? a : b);
            console.log('Found possible users array:', largestArray);
            setUsers(largestArray);
            showSnackbar(`Found ${largestArray.length} possible users`, 'warning');
          }
        }
      } else {
        console.error('UserManagement: No data received or invalid format');
        showSnackbar('Error loading users: No data received', 'error');
      }
    } catch (error) {
      console.error('Error in loadUsers:', error);
      showSnackbar(`Error loading users: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      // Edit mode
      setEditMode(true);
      setSelectedUser(user);
      setFormData({
        username: user.username,
        password: '',
        confirmPassword: '',
        name: user.name || '',
        role: user.role
      });
    } else {
      // Add mode
      setEditMode(false);
      setSelectedUser(null);
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: ROLES.USER
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!editMode && !formData.password) {
      errors.password = 'Password is required';
    }
    
    if (!editMode && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (formData.password && formData.password.length < 3) {
      errors.password = 'Password must be at least 3 characters';
    }
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (editMode) {
        // Update existing user
        const result = await updateUser(selectedUser.username, {
          name: formData.name,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        });
        
        if (result.success) {
          showSnackbar('User updated successfully');
          handleCloseDialog();
          await loadUsers();
        } else {
          showSnackbar(result.message || 'Failed to update user', 'error');
        }
      } else {
        // Add new user
        const result = await addUser({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: formData.role
        });
        
        if (result.success) {
          showSnackbar('User added successfully');
          handleCloseDialog();
          await loadUsers();
        } else {
          showSnackbar(result.message || 'Failed to add user', 'error');
        }
      }
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      setLoading(true);
      try {
        const result = await deleteUser(username);
        
        if (result.success) {
          showSnackbar('User deleted successfully');
          await loadUsers();
        } else {
          showSnackbar(result.message || 'Failed to delete user', 'error');
        }
      } catch (error) {
        showSnackbar(`Error deleting user: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const isCurrentUser = (username) => {
    return currentUser.username === username;
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh users from database">
            <IconButton 
              color="primary" 
              onClick={loadUsers} 
              disabled={loading}
              aria-label="refresh users"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            New User
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {console.log('Rendering user table with users:', users)}
                {users && users.length > 0 ? (
                  users.map(user => (
                    <TableRow key={user.username} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.name || '-'}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: 
                              user.role === ROLES.ADMIN 
                                ? 'error.light' 
                                : 'info.light',
                            color: 'white'
                          }}
                        >
                          {user.role}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDialog(user)}
                          size="small"
                          disabled={!isAdmin} // Only admin can edit users
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteUser(user.username)}
                          disabled={isCurrentUser(user.username) || !isAdmin} // Can't delete current user and only admin can delete
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>
      
      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            id="username"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={handleInputChange}
            disabled={editMode} // Can't change username in edit mode
            error={!!formErrors.username}
            helperText={formErrors.username}
            autoComplete="off"
          />
          <TextField
            margin="dense"
            id="name"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            autoComplete="off"
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label={editMode ? "New Password (leave blank to keep current)" : "Password"}
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            autoComplete="new-password"
          />
          <TextField
            margin="dense"
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={!!formErrors.confirmPassword}
            helperText={formErrors.confirmPassword}
            autoComplete="new-password"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleInputChange}
              disabled={isCurrentUser(formData.username)} // Can't change own role
            >
              <MenuItem value={ROLES.USER}>User</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.ADMIN}>Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
