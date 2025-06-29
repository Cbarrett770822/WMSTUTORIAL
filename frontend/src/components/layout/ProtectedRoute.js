/**
 * Protected Route Component
 * 
 * Higher-order component for handling authenticated routes with role-based access control.
 * This eliminates redundant route protection code across the application.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './Layout';
import { selectIsAuthenticated, selectCurrentUser, selectIsAdmin, selectIsSupervisor } from '../../features/auth/authSlice';

/**
 * Protected Route Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string|Array<string>} props.requiredRole - Required role(s) to access this route (optional)
 * @param {string} props.redirectTo - Path to redirect to if not authenticated (default: '/login')
 * @returns {React.ReactElement} - Protected route component
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  redirectTo = '/login' 
}) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const userRole = currentUser?.role;
  const location = useLocation();
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }
  
  // Check if user has required role
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!requiredRoles.includes(userRole)) {
      // Redirect to unauthorized page
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  // Render children within layout
  return <Layout>{children}</Layout>;
};

/**
 * Admin Route Component - Only allows admin users
 */
export const AdminRoute = ({ children }) => {
  const isAdmin = useSelector(selectIsAdmin);
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  
  // Debug logging
  console.log('AdminRoute - Current user:', currentUser);
  console.log('AdminRoute - Is admin?', isAdmin);
  console.log('AdminRoute - User role:', currentUser?.role);
  
  if (!isAdmin) {
    console.log('AdminRoute - Access denied, redirecting to /unauthorized');
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }
  
  console.log('AdminRoute - Access granted');
  return children;
};

/**
 * Supervisor Route Component - Now just an alias for AdminRoute for backward compatibility
 */
export const SupervisorRoute = AdminRoute;

export default ProtectedRoute;
