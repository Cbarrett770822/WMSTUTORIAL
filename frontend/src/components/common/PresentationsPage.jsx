import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getPresentations } from '../../services/presentationService';
import { selectIsAdmin, selectIsAuthenticated } from '../../features/auth/authSlice';
import { initializePresentationsData, selectPresentations, fetchPresentations, setSkipSaveAction } from '../../features/presentations/presentationsSlice';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress,
  Grid,
  Button,
  Tooltip,
  IconButton
} from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LaunchIcon from '@mui/icons-material/Launch';

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
  
  // Process presentation URL and open in a new tab
  const handlePresentationSelect = (presentation) => {
    if (!presentation) return;
    
    try {
      // Process the URL based on presentation type
      let finalUrl = '';
      let directUrl = presentation.directUrl || presentation.url;
      
      console.log('Opening presentation:', presentation.title);
      console.log('Initial URL:', directUrl);
      
      // Handle local files
      if (presentation.isLocal) {
        setError('Local files cannot be opened directly in a browser. Please upload to a cloud service first.');
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      // Add https:// if missing
      if (!/^https?:\/\//i.test(directUrl)) {
        directUrl = 'https://' + directUrl;
        console.log('Added protocol to URL:', directUrl);
      }
      
      // Handle Google Slides
      if (directUrl.includes('docs.google.com/presentation')) {
        // Extract the presentation ID
        const presentationIdMatch = directUrl.match(/\/d\/([^\/]+)/i);
        if (presentationIdMatch && presentationIdMatch[1]) {
          const presentationId = presentationIdMatch[1];
          // Use /present endpoint for full-screen presentation in new tab
          finalUrl = `https://docs.google.com/presentation/d/${presentationId}/present`;
          console.log('Using Google Slides presentation URL:', finalUrl);
        } else {
          finalUrl = directUrl;
        }
      }
      // Handle SharePoint files
      else if (directUrl.includes('sharepoint.com')) {
        // For SharePoint, we need to use the Office Online viewer
        const encodedUrl = encodeURIComponent(directUrl);
        finalUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
        console.log('Using SharePoint viewer URL:', finalUrl);
      }
      // Handle other PowerPoint files
      else {
        // Ensure the URL has a proper file extension
        const fileExtensions = ['.ppt', '.pptx', '.pdf', '.doc', '.docx'];
        const hasExtension = fileExtensions.some(ext => directUrl.toLowerCase().endsWith(ext));
        
        if (!hasExtension && presentation.fileType) {
          directUrl = `${directUrl}.${presentation.fileType}`;
          console.log('Appended file extension to URL:', directUrl);
        }
        
        // Remove query parameters for S3 and other URLs that might cause issues
        if (directUrl.includes('amazonaws.com') || directUrl.includes('blob.core.windows.net')) {
          directUrl = directUrl.split('?')[0];
          console.log('Removed query parameters from URL:', directUrl);
        }
        
        // Use Office Online viewer with view.aspx (not embed.aspx) for full page view
        const encodedUrl = encodeURIComponent(directUrl);
        finalUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
        console.log('Using Office viewer URL:', finalUrl);
      }
      
      // Open the URL in a new tab
      if (finalUrl) {
        window.open(finalUrl, '_blank');
      } else {
        setError('Could not process the presentation URL.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error opening presentation:', error);
      setError(`Error opening presentation: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    }
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
        <Box sx={{ width: '100%' }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Available Presentations
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Click on any presentation to open it in a new browser tab. Supported formats include PowerPoint files, Google Slides, and SharePoint presentations.
              </Typography>
              
              {presentations && presentations.length > 0 ? (
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {presentations.map((presentation) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={presentation.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: 3,
                            '& .launch-icon': {
                              opacity: 1
                            }
                          }
                        }}
                        onClick={() => handlePresentationSelect(presentation)}
                      >
                        <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                            <SlideshowIcon sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />
                            <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1 }}>
                              {presentation.title}
                            </Typography>
                            <Tooltip title="Open in new tab">
                              <IconButton 
                                size="small" 
                                className="launch-icon"
                                sx={{ 
                                  opacity: 0.3,
                                  transition: 'opacity 0.2s',
                                  ml: 1
                                }}
                              >
                                <LaunchIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mb: 2,
                            minHeight: '40px'
                          }}>
                            {presentation.description || 'No description available'}
                          </Typography>
                          
                          {presentation.isLocal ? (
                            <Typography variant="caption" display="block" color="error" sx={{ mt: 'auto' }}>
                              Local file (cannot be opened directly)
                            </Typography>
                          ) : (
                            <Button 
                              variant="outlined" 
                              size="small" 
                              startIcon={<OpenInNewIcon />}
                              sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePresentationSelect(presentation);
                              }}
                            >
                              Open Presentation
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No presentations available. Add presentations in the Settings page.
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {isAdmin ? (
            <Alert severity="info">
              <Typography variant="body2" component="div">
                To add or manage presentations, go to the <strong>Settings</strong> page.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info">
              <Typography variant="body2" component="div">
                Contact an administrator to add or manage presentations.
              </Typography>
            </Alert>
          )}
        </Box>
      )}
      </Box>
    </Container>
  );
};

export default PresentationsPage;
