import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getPresentations } from '../../services/presentationService';
import { selectIsAdmin, selectIsAuthenticated } from '../../features/auth/authSlice';
import { initializePresentationsData, selectPresentations, fetchPresentations, setSkipSave } from '../../features/presentations/presentationsSlice';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress
} from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import PptViewer from './PptViewer';

const PresentationsPage = () => {
  const dispatch = useDispatch();
  const isAdmin = useSelector(selectIsAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const reduxPresentations = useSelector(selectPresentations);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const retryCountRef = useRef(0);
  
  // Always fetch presentations from API when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      // Mark as initialized but don't load from localStorage
      dispatch(initializePresentationsData());
      // Fetch fresh data from the API
      dispatch(fetchPresentations());
    }
  }, [dispatch, isAuthenticated]);
  
  // Update local presentations state when Redux state changes
  useEffect(() => {
    if (reduxPresentations && reduxPresentations.length > 0) {
      setPresentations(reduxPresentations);
      setLoading(false);
      
      // If there's a selected presentation, update it with the latest data
      if (selectedPresentation) {
        const updated = reduxPresentations.find(p => p.id === selectedPresentation.id || 
                                      String(p.id) === String(selectedPresentation.id));
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPresentation)) {
          setSelectedPresentation(updated);
        }
      }
    }
  }, [reduxPresentations]); // Only depend on reduxPresentations, not selectedPresentation

  // Load presentations directly from API, ignoring any cached data
  useEffect(() => {
    const loadPresentations = async () => {
      // Only attempt to load presentations if user is authenticated
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping presentations fetch');
        setLoading(false);
        return;
      }
      
      // Always load from API, even if Redux state has data
      // This ensures we always have the latest data
      
      try {
        setLoading(true);
        const data = await getPresentations();
        if (data && data.length > 0) {
          setPresentations(data);
          setError(null);
        }
        // Reset retry count on success
        retryCountRef.current = 0;
      } catch (err) {
        console.error('Error loading presentations:', err);
        setError('Failed to load presentations. Please try again later.');
        
        // Use ref for retry logic to avoid dependency on state updates
        if (retryCountRef.current < 3 && isAuthenticated) {
          retryCountRef.current += 1;
          console.log(`Retry attempt ${retryCountRef.current} of 3`);
          // Schedule retry after delay without updating state
          setTimeout(() => {
            if (isAuthenticated) {
              loadPresentations();
            }
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadPresentations();
  }, [isAuthenticated, reduxPresentations]); // Don't include retryCount in dependencies
  
  const handlePresentationSelect = (presentation) => {
    setSelectedPresentation(presentation);
    // Set skipSave to false to ensure any subsequent changes will be saved
    dispatch(setSkipSave(false));
  };
  
  // Handle presentation errors
  const handlePresentationError = (message) => {
    setError(message || 'An error occurred with the presentation');
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PowerPoint Presentations
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' }, minWidth: { xs: '100%', md: 'calc(33.333% - 16px)' } }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Available Presentations
                </Typography>
                
                {presentations && presentations.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {presentations.map((presentation) => (
                      <Card 
                        key={presentation.id} 
                        variant="outlined" 
                        sx={{ 
                          cursor: 'pointer',
                          bgcolor: selectedPresentation?.id === presentation.id ? 'action.selected' : 'background.paper',
                          '&:hover': { bgcolor: 'action.hover' },
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onClick={() => handlePresentationSelect(presentation)}
                      >
                        <CardContent sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          height: '100%',
                          p: 2, 
                          '&:last-child': { pb: 2 } 
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <SlideshowIcon sx={{ mr: 1, color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="subtitle1" component="div" noWrap sx={{ fontWeight: 'medium' }}>
                              {presentation.title}
                            </Typography>
                          </Box>
                          <Typography key={`${presentation.id}-desc`} variant="body2" color="text.secondary" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flexGrow: 1,
                            mb: 1
                          }}>
                            {presentation.description}
                          </Typography>
                          <Typography key={`${presentation.id}-url`} variant="caption" color="text.secondary" sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 1,
                            fontSize: '0.7rem'
                          }}>
                            URL: {presentation.directUrl || presentation.url}
                          </Typography>
                          {presentation.isLocal && (
                            <Typography key={`${presentation.id}-local`} variant="caption" display="block" color="primary" sx={{ mt: 'auto' }}>
                              Local file
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No presentations available. Add presentations in the Settings page.
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {isAdmin ? (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2" component="div">
                  To add or manage presentations, go to the <strong>Settings</strong> page.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2" component="div">
                  Contact an administrator to add or manage presentations.
                </Typography>
              </Alert>
            )}
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.667% - 16px)' }, minWidth: { xs: '100%', md: 'calc(66.667% - 16px)' } }}>
            {selectedPresentation ? (
              <PptViewer 
                presentation={selectedPresentation} 
                height="600px"
              />
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '600px',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center'
                }}
              >
                <SlideshowIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a presentation from the list to view it
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Browse presentations from the list on the left
                </Typography>
              </Box>
            )}
            
            {/* Alert removed as per user request */}
          </Box>
        </Box>
      )}
      </Box>
    </Container>
  );
};

export default PresentationsPage;
