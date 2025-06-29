/**
 * Layout Component
 * 
 * Common layout wrapper for authenticated pages with navigation and user controls.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Box,
  Container,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Description as ProcessIcon,
  Slideshow as PresentationsIcon,
  Group as UserManagementIcon
} from '@mui/icons-material';
import { logout, selectUser } from '../../features/auth/authSlice';
import { handleUserLogout } from '../../services/unifiedSettingsService';
import { getTheme, setTheme } from '../../services/unifiedSettingsService';
import { log } from '../../services/logService';

/**
 * Main layout component for authenticated pages
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {React.ReactElement} - Layout component
 */
const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  
  // State for drawer and user menu
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState(null);
  
  // Handle user logout
  const handleLogout = async () => {
    log('info', 'User logging out', { username: user?.username });
    
    // Save settings before logout
    await handleUserLogout(user);
    
    // Dispatch logout action
    dispatch(logout());
    
    // Navigate to login page
    navigate('/login');
  };
  
  // Toggle drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Toggle theme
  const toggleTheme = () => {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    window.location.reload(); // Reload to apply theme change
  };
  
  // Open user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  // Close user menu
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Navigation items based on user role
  const navigationItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/',
      roles: ['admin', 'user']
    },
    { 
      text: 'Processes', 
      icon: <ProcessIcon />, 
      path: '/processes',
      roles: ['admin', 'user']
    },
    { 
      text: 'Presentations', 
      icon: <PresentationsIcon />, 
      path: '/presentations',
      roles: ['admin', 'user']
    },
    { 
      text: 'User Management', 
      icon: <UserManagementIcon />, 
      path: '/users',
      roles: ['admin']
    },
    { 
      text: 'Settings', 
      icon: <SettingsIcon />, 
      path: '/settings',
      roles: ['admin']
    }
  ];
  
  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => {
    if (!user || !user.role) return false;
    
    // Case-insensitive role comparison
    const userRole = user.role.toLowerCase();
    return item.roles.some(role => role.toLowerCase() === userRole);
  });
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WMS Tutorial
          </Typography>
          
          <Button color="inherit" onClick={toggleTheme}>
            {getTheme() === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
          
          <IconButton
            color="inherit"
            onClick={handleUserMenuOpen}
            aria-controls="user-menu"
            aria-haspopup="true"
          >
            <PersonIcon />
          </IconButton>
          
          <Menu
            id="user-menu"
            anchorEl={userMenuAnchor}
            keepMounted
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.username} ({user?.role})
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer}
          onKeyDown={toggleDrawer}
        >
          <List>
            {filteredNavigationItems.map((item) => (
              <ListItem 
                button 
                key={item.text} 
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
      
      {/* Footer */}
      <Box component="footer" sx={{ py: 2, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            WMS Tutorial App © {new Date().getFullYear()}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
