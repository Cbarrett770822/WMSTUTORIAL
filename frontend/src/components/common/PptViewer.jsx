import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAdmin } from '../../features/auth/authSlice';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const PptViewer = ({ presentation, width = '100%', height = '600px' }) => {
  const isAdmin = useSelector(selectIsAdmin);
  const [viewerUrl, setViewerUrl] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [isLocalFile, setIsLocalFile] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // Add a key to force iframe remounting
  
  // Refs for iframe and error handling
  const iframeRef = useRef(null);
  const previousPresentationRef = useRef(null);
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    console.log('Iframe loaded successfully');
    setLoading(false);
    setIframeError(false);
    setError('');
  };
  
  // Handle iframe error event
  const handleIframeError = () => {
    console.error('Iframe failed to load presentation');
    console.error('Attempted to load URL:', viewerUrl);
    
    // Provide detailed diagnostics
    let errorMessage = 'Failed to load presentation. ';
    
    if (typeof viewerUrl !== 'string') {
      errorMessage += 'Invalid URL format.';
    } else if (!viewerUrl.startsWith('https://')) {
      errorMessage += 'URL must use HTTPS protocol for security reasons.';
    } else if (viewerUrl.includes('localhost') || viewerUrl.includes('127.0.0.1')) {
      errorMessage += 'Local URLs cannot be accessed by the Microsoft Office viewer. The presentation must be hosted on a public server.';
    } else if (presentation.url && presentation.url.includes('example.com')) {
      errorMessage += 'This presentation uses a placeholder URL that cannot be accessed. Please use a real, publicly accessible PowerPoint URL.';
    } else if (presentation.url && presentation.url.includes('docs.google.com') && presentation.url.includes('YZ9LmNLo8YX7KYZ8JYZ9YZ9')) {
      errorMessage += 'This presentation uses a placeholder Google Slides ID that does not exist. Please use a real Google Slides presentation.';
    } else {
      errorMessage += 'The presentation URL may be inaccessible or the file format is not supported.';
    }
    
    setIframeError(true);
    setLoading(false);
    setError(errorMessage);
  };
  
  // Clean up function to reset iframe
  const resetIframe = () => {
    if (iframeRef.current) {
      // Simply clear the iframe src - we'll set it again in the render
      iframeRef.current.src = '';
      console.log('Iframe source cleared for reset');
    }
  };
  
  useEffect(() => {
    if (!presentation) return;
    
    // Track the current presentation to prevent unnecessary reloads
    const currentPresentationId = presentation.id || presentation._id;
    
    // Reset state for new presentation
    setLoading(true);
    setIframeError(false);
    setError('');
    
    // Only reset the iframe if we're actually changing presentations
    // This prevents the blinking effect when the same presentation is selected
    if (previousPresentationRef.current !== currentPresentationId) {
      console.log('Presentation changed, resetting iframe');
      resetIframe();
      // Increment the key to force a complete iframe remount
      setIframeKey(prevKey => prevKey + 1);
      previousPresentationRef.current = currentPresentationId;
    }
    
    console.log('Processing presentation data:', presentation);
    
    // Check if this is a local file or URL
    if (presentation.isLocal) {
      setIsLocalFile(true);
      // For local files, we use the local path directly
      // The file should be in the public folder
      const localPath = `${process.env.PUBLIC_URL}/${presentation.url}`;
      setDirectUrl(localPath);
      setViewerUrl(''); // No viewer for local files
      setLoading(false);
    } else {
      setIsLocalFile(false);
      
      // Process the URL to make it compatible with Office Online viewer
      let directUrl = presentation.directUrl || presentation.url;
      console.log('Initial URL from database:', directUrl);
      
      // Check for placeholder Google Slides ID
      if (directUrl.includes('YZ9LmNLo8YX7KYZ8JYZ9YZ9')) {
        console.log('Detected placeholder Google Slides ID');
        setIframeError(true);
        setLoading(false);
        setError('This presentation uses a placeholder Google Slides ID that does not exist. Please use a real Google Slides presentation.');
        return;
      }
      
      // Clean up the URL
      // 1. Add https:// if missing
      if (!/^https?:\/\//i.test(directUrl)) {
        directUrl = 'https://' + directUrl;
        console.log('Added protocol to URL:', directUrl);
      }
      
      // 2. Special handling for Google Slides presentations
      if (directUrl.includes('docs.google.com/presentation')) {
        // Extract the presentation ID
        const presentationIdMatch = directUrl.match(/\/d\/([^\/]+)/i);
        if (presentationIdMatch && presentationIdMatch[1]) {
          const presentationId = presentationIdMatch[1];
          
          // For Google Slides, we have two options:
          // 1. Use the export URL (downloads as PPTX)
          // directUrl = `https://docs.google.com/presentation/d/${presentationId}/export/pptx`;
          
          // 2. Use Google's own viewer (better option)
          directUrl = `https://docs.google.com/presentation/d/${presentationId}/preview`;
          console.log('Using Google\'s native preview URL:', directUrl);
          
          // For Google Slides, we'll use their native viewer instead of Microsoft's
          setViewerUrl(directUrl);
          setDirectUrl(directUrl);
          return;
        }
      }
      
      // 3. Ensure the URL has a proper file extension for non-Google Slides
      const fileExtensions = ['.ppt', '.pptx', '.pdf', '.doc', '.docx'];
      const hasExtension = fileExtensions.some(ext => directUrl.toLowerCase().endsWith(ext));
      
      if (!hasExtension && presentation.fileType) {
        directUrl = `${directUrl}.${presentation.fileType}`;
        console.log('Appended file extension to URL:', directUrl);
      }
      
      // 4. Remove query parameters for S3 and other URLs that might cause issues
      if (directUrl.includes('amazonaws.com') || directUrl.includes('blob.core.windows.net')) {
        directUrl = directUrl.split('?')[0];
        console.log('Removed query parameters from URL:', directUrl);
      }
      
      // Create the Office Online viewer URL with proper encoding
      const encodedUrl = encodeURIComponent(directUrl);
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
      console.log('Created Office viewer URL:', officeViewerUrl);
      
      setViewerUrl(officeViewerUrl);
      setDirectUrl(directUrl);
      setLoading(false);
    }
  }, [presentation]);
  
  if (!presentation) {
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          No presentation selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a presentation from the list to view it.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {presentation.title}
      </Typography>
      {presentation.description && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {presentation.description}
        </Typography>
      )}
      
      {error && (
        <div className="error-container">
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Presentation URL: {directUrl}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Note: Microsoft Office Online viewer requires publicly accessible HTTPS URLs.
              Local files, localhost URLs, or placeholder URLs will not work.
            </Typography>
          </Box>
        </div>
      )}
      
      {isLocalFile ? (
        <Box sx={{ width: '100%', height: height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5', p: 4, borderRadius: 2 }}>
          <Alert severity="info" sx={{ mb: 4, width: '100%' }}>
            This is a local PowerPoint file. Microsoft Office Online viewer cannot display local files directly.
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            Options for viewing this presentation:
          </Typography>
          
          <Box sx={{ mt: 2, mb: 4, width: '100%' }}>
            <Typography variant="body1" paragraph>
              <strong>Note:</strong> This is a local file that cannot be viewed in the online viewer.
            </Typography>
            
            <Typography variant="body1" paragraph sx={{ mt: 3 }}>
              <strong>Upload to a cloud service</strong> (like OneDrive, Google Drive) and use the public link instead.
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          <Box sx={{ width: '100%', height: height, overflow: 'hidden', position: 'relative' }}>
            {loading && (
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                zIndex: 1
              }}>
                <CircularProgress />
              </Box>
            )}
            
            {iframeError ? (
              <Box sx={{ 
                width: '100%', 
                height: height, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f5f5',
                p: 4,
                borderRadius: 1
              }}>
                <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                <Typography variant="h6" color="error" gutterBottom>
                  Unable to load presentation viewer
                </Typography>
                <Typography variant="body2" align="center" sx={{ mb: 3 }}>
                  The presentation viewer couldn't be loaded. This may be due to security restrictions, 
                  unsupported file format, or the file not being publicly accessible.
                </Typography>
              </Box>
            ) : viewerUrl ? (
              <iframe
                key={iframeKey} // Add key prop to force remount when it changes
                ref={iframeRef}
                src={viewerUrl}
                width={width}
                height={height}
                frameBorder="0"
                title={presentation.title}
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            ) : (
              <Box sx={{ 
                width: '100%', 
                height: height, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f5f5',
                p: 4,
                borderRadius: 1
              }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1">
                  Preparing presentation viewer...
                </Typography>
              </Box>
            )}
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Note: The PowerPoint viewer requires the presentation to be hosted at a publicly accessible URL.
              For security reasons, Microsoft's Office Online viewer only works with presentations hosted on public servers.
            </Typography>
          </Alert>
        </>
      )}
    </Paper>
  );
};

export default PptViewer;
