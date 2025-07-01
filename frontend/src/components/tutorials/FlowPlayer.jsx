import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ReactPlayer from 'react-player';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import {
  selectSelectedProcess,
  selectCurrentStep,
  setCurrentStep,
  nextStep,
  previousStep,
  setVideoPlaying
} from '../../features/processes/processesSlice';

const FlowPlayer = () => {
  const dispatch = useDispatch();
  const process = useSelector(selectSelectedProcess);
  const currentStep = useSelector(selectCurrentStep);
  const isPlaying = useSelector(state => state.processes.isVideoPlaying);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Video URL state variables
  const [videoUrl, setVideoUrl] = useState('');
  const [isGoogleDrive, setIsGoogleDrive] = useState(false);
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [googleDriveEmbedUrl, setGoogleDriveEmbedUrl] = useState(null);

  // Reset video error state when current step changes
  useEffect(() => {
    setVideoError(false);
  }, [currentStep, process?.id]);
  
  // Helper function to sanitize URLs for CSP compliance
  const sanitizeUrl = (url) => {
    if (!url) return '';
    try {
      // Create a URL object to validate and sanitize the URL
      const urlObj = new URL(url);
      // Only allow specific domains for security
      if (['youtube.com', 'www.youtube.com', 'youtu.be', 'drive.google.com', 'docs.google.com'].includes(urlObj.hostname) ||
          urlObj.hostname.endsWith('.googleapis.com')) {
        return url;
      }
      // For other domains, check if it's a relative URL
      if (urlObj.hostname === window.location.hostname) {
        return url;
      }
      console.warn('Potentially unsafe URL blocked:', url);
      return '';
    } catch (error) {
      // If URL parsing fails, check if it's a relative path
      if (url.startsWith('/')) {
        return url;
      }
      console.error('Invalid URL:', url, error);
      return '';
    }
  };
  
  // Function to extract Google Drive file ID from URL
  const extractGoogleDriveFileId = (url) => {
    if (!url) return null;
    
    try {
      // Handle different Google Drive URL formats
      let fileId = null;
      
      // Format: https://drive.google.com/file/d/FILE_ID/view
      if (typeof url === 'string' && url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([^\/\?&]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      }
      // Format: https://drive.google.com/open?id=FILE_ID
      else if (typeof url === 'string' && url.includes('open?id=')) {
        const match = url.match(/open\?id=([^\/\?&]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      }
      // Format: https://docs.google.com/presentation/d/FILE_ID/edit
      else if (typeof url === 'string' && url.includes('/presentation/d/')) {
        const match = url.match(/\/presentation\/d\/([^\/\?&]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      }
      
      return fileId;
    } catch (error) {
      console.error('Error extracting Google Drive file ID:', error);
      return null;
    }
  };
  
  // Function to extract YouTube video ID from URL
  const extractYoutubeId = (url) => {
    if (!url) return null;
    
    try {
      // Handle different YouTube URL formats
      let videoId = null;
      
      console.log('Attempting to extract YouTube ID from URL:', url);
      
      // Try to parse the URL first
      try {
        const urlObj = new URL(url);
        
        // Format: https://www.youtube.com/watch?v=VIDEO_ID
        if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) {
          videoId = urlObj.searchParams.get('v');
          console.log('Extracted YouTube ID from watch URL:', videoId);
        }
        // Format: https://www.youtube.com/live/VIDEO_ID
        else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/live/')) {
          // Extract the ID from the pathname
          const pathParts = urlObj.pathname.split('/');
          // The ID should be right after 'live' in the path
          const liveIndex = pathParts.indexOf('live');
          if (liveIndex !== -1 && liveIndex < pathParts.length - 1) {
            videoId = pathParts[liveIndex + 1];
            console.log('Extracted YouTube live video ID from pathname:', videoId);
          }
        }
        // Format: https://www.youtube.com/embed/VIDEO_ID
        else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/embed/')) {
          const pathParts = urlObj.pathname.split('/');
          const embedIndex = pathParts.indexOf('embed');
          if (embedIndex !== -1 && embedIndex < pathParts.length - 1) {
            videoId = pathParts[embedIndex + 1];
            console.log('Extracted YouTube embed video ID from pathname:', videoId);
          }
        }
        // Format: https://youtu.be/VIDEO_ID
        else if (urlObj.hostname === 'youtu.be') {
          // The ID is the pathname without the leading slash
          videoId = urlObj.pathname.substring(1).split('/')[0].split('?')[0];
          console.log('Extracted YouTube short URL video ID:', videoId);
        }
      } catch (urlError) {
        console.warn('URL parsing failed, falling back to regex:', urlError);
      }
      
      // If URL parsing failed or didn't extract an ID, try regex fallbacks
      if (!videoId) {
        // Format: youtube.com/watch?v=ID
        let match = url.match(/youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
        if (match && match[1]) {
          videoId = match[1];
          console.log('Regex fallback - YouTube watch ID:', videoId);
        }
        // Format: youtu.be/ID
        else if ((match = url.match(/youtu\.be\/([^\/?&]+)/))) {
          videoId = match[1];
          console.log('Regex fallback - YouTube short URL ID:', videoId);
        }
        // Format: youtube.com/embed/ID
        else if ((match = url.match(/\/embed\/([^\/?&]+)/))) {
          videoId = match[1];
          console.log('Regex fallback - YouTube embed ID:', videoId);
        }
        // Format: youtube.com/live/ID
        else if ((match = url.match(/youtube\.com\/live\/([^\/?&]+)/))) {
          videoId = match[1];
          console.log('Regex fallback - YouTube live ID:', videoId);
        }
      }
      
      // Final validation - YouTube IDs are typically 11 characters
      if (videoId && (videoId.length < 5 || videoId.length > 20)) {
        console.warn('Extracted YouTube ID has unusual length:', videoId.length);
      }
      
      return videoId;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
    }
  };

  // Process video URLs in useEffect hook to prevent infinite loop
  useEffect(() => {
    // Safe access to current step
    const currentStepData = process?.steps && process.steps[currentStep] ? process.steps[currentStep] : null;
    
    // Reset all video state
    setVideoUrl('');
    setIsGoogleDrive(false);
    setYoutubeEmbedUrl(null);
    setIsYouTube(false);
    setGoogleDriveEmbedUrl(null);
    setVideoError(false);
    
    // Process step-level video URL
    if (currentStepData && typeof currentStepData.videoUrl === 'string') {
      try {
        const rawUrl = currentStepData.videoUrl.trim();
        
        if (rawUrl.startsWith('http')) {
          // Check if it's a Google Drive URL
          if (rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com')) {
            setIsGoogleDrive(true);
            setVideoUrl(sanitizeUrl(rawUrl));
            
            // Extract Google Drive file ID
            const fileId = extractGoogleDriveFileId(rawUrl);
            
            if (fileId) {
              // Create a proper Google Drive embed URL that works with CSP
              setGoogleDriveEmbedUrl(`https://drive.google.com/file/d/${fileId}/preview`);
              console.log('Created Google Drive embed URL:', `https://drive.google.com/file/d/${fileId}/preview`);
              
              // If there's a fallback video URL provided (should be YouTube), use that as well
              if (currentStepData.fallbackVideoUrl) {
                const fallbackYoutubeId = extractYoutubeId(currentStepData.fallbackVideoUrl);
                if (fallbackYoutubeId) {
                  setYoutubeEmbedUrl(`https://www.youtube.com/embed/${fallbackYoutubeId}?autoplay=0&rel=0&showinfo=1&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`);
                  console.log('Using YouTube fallback URL:', `https://www.youtube.com/embed/${fallbackYoutubeId}`);
                }
              }
            } else {
              console.error('Could not extract Google Drive file ID from URL:', rawUrl);
              setVideoError(true);
            }
          } else if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
            // Handle YouTube videos
            setIsYouTube(true);
            setVideoUrl(sanitizeUrl(rawUrl));
            
            // Extract YouTube video ID
            const youtubeId = extractYoutubeId(rawUrl);
            if (youtubeId) {
              setYoutubeEmbedUrl(`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&showinfo=1&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`);
              console.log('Created YouTube embed URL:', `https://www.youtube.com/embed/${youtubeId}`);
            } else {
              console.error('Could not extract YouTube video ID from URL:', rawUrl);
              setVideoError(true);
            }
          } else {
            // Other external videos - apply sanitization
            const sanitized = sanitizeUrl(rawUrl);
            setVideoUrl(sanitized);
            if (!sanitized) {
              console.warn('External video URL blocked by sanitizer:', rawUrl);
              setVideoError(true);
            }
          }
        } else if (rawUrl) {
          // For local videos, ensure we have the correct path
          setVideoUrl(`/videos/${rawUrl}`);
          console.log('Using local video path:', `/videos/${rawUrl}`);
        }
      } catch (error) {
        console.error('Error processing video URL:', error);
        setVideoError(true);
      }
    } else if (process?.videoUrl) {
      // Use process-level video URL as fallback
      try {
        console.log('Using process-level video URL as fallback');
        const rawUrl = process.videoUrl.trim();
        
        if (rawUrl.startsWith('http')) {
          // Check if it's a Google Drive URL
          if (rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com')) {
            setIsGoogleDrive(true);
            setVideoUrl(sanitizeUrl(rawUrl));
            
            // Extract Google Drive file ID
            const fileId = extractGoogleDriveFileId(rawUrl);
            
            if (fileId) {
              // Create a proper Google Drive embed URL that works with CSP
              setGoogleDriveEmbedUrl(`https://drive.google.com/file/d/${fileId}/preview`);
              console.log('Created Google Drive embed URL from process:', `https://drive.google.com/file/d/${fileId}/preview`);
              
              // If there's a fallback video URL provided (should be YouTube), use that as well
              if (process.fallbackVideoUrl) {
                const fallbackYoutubeId = extractYoutubeId(process.fallbackVideoUrl);
                if (fallbackYoutubeId) {
                  setYoutubeEmbedUrl(`https://www.youtube.com/embed/${fallbackYoutubeId}?autoplay=0&rel=0&showinfo=1&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`);
                  console.log('Using YouTube fallback URL from process:', `https://www.youtube.com/embed/${fallbackYoutubeId}`);
                }
              }
            } else {
              console.error('Could not extract Google Drive file ID from process URL:', rawUrl);
              setVideoError(true);
            }
          } else if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
            // Handle YouTube videos
            setIsYouTube(true);
            setVideoUrl(sanitizeUrl(rawUrl));
            
            // Extract YouTube video ID
            const youtubeId = extractYoutubeId(rawUrl);
            if (youtubeId) {
              setYoutubeEmbedUrl(`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&showinfo=1&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`);
              console.log('Created YouTube embed URL from process:', `https://www.youtube.com/embed/${youtubeId}`);
            } else {
              console.error('Could not extract YouTube video ID from process URL:', rawUrl);
              setVideoError(true);
            }
          } else {
            // Other external videos - apply sanitization
            const sanitized = sanitizeUrl(rawUrl);
            setVideoUrl(sanitized);
            if (!sanitized) {
              console.warn('External process video URL blocked by sanitizer:', rawUrl);
              setVideoError(true);
            }
          }
        } else if (rawUrl) {
          // For local videos, ensure we have the correct path
          setVideoUrl(`/videos/${rawUrl}`);
          console.log('Using local video path from process:', `/videos/${rawUrl}`);
        }
      } catch (error) {
        console.error('Error processing process-level video URL:', error);
        setVideoError(true);
      }
    }
    
    // No default video fallback - if no video URL is found, we'll show the "No video available" message
    console.log('Current video URL:', videoUrl || 'None', 'Is Google Drive:', isGoogleDrive);
  }, [currentStep, process?.id, process?.videoUrl]);

  // If no process is selected, show a message
  if (!process) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6">No process selected</Typography>
      </Box>
    );
  }

  const handleStepChange = (step) => {
    dispatch(setCurrentStep(step));
    dispatch(setVideoPlaying(true));
  };

  const handleNext = () => {
    dispatch(nextStep());
  };

  const handleBack = () => {
    dispatch(previousStep());
  };
  
  // Direct fullscreen function using browser's native API
  const openNativeFullscreen = () => {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) {
      console.error('Video container not found');
      return;
    }
    
    console.log('Opening native fullscreen for video container');
    
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen();
    } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
      videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.msRequestFullscreen) { /* IE11 */
      videoContainer.msRequestFullscreen();
    } else if (videoContainer.mozRequestFullScreen) { /* Firefox */
      videoContainer.mozRequestFullScreen();
    }
  };

  const handlePlayPause = () => {
    dispatch(setVideoPlaying(!isPlaying));
  };

  const handleFullscreen = () => {
    console.log('Fullscreen button clicked');
    console.log('Player ref:', playerRef.current);
    console.log('Iframe ref:', iframeRef.current);
    
    // Get the video container element
    const videoContainer = document.querySelector('.video-container');
    console.log('Video container:', videoContainer);
    
    if (isGoogleDrive && iframeRef.current) {
      console.log('Handling Google Drive iframe fullscreen');
      // Handle fullscreen for Google Drive iframe
      const iframe = iframeRef.current;
      
      if (document.fullscreenElement) {
        console.log('Exiting fullscreen mode');
        // Exit fullscreen if already in fullscreen mode
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        console.log('Entering fullscreen mode for iframe');
        // Enter fullscreen for iframe
        if (iframe.requestFullscreen) {
          iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) {
          iframe.webkitRequestFullscreen();
        } else if (iframe.mozRequestFullScreen) {
          iframe.mozRequestFullScreen();
        } else if (iframe.msRequestFullscreen) {
          iframe.msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } else if (videoContainer) {
      console.log('Using video container for fullscreen');
      // Use the container div for fullscreen instead of the player
      if (document.fullscreenElement) {
        console.log('Exiting fullscreen mode');
        // Exit fullscreen if already in fullscreen mode
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        console.log('Entering fullscreen mode for video container');
        // Enter fullscreen and auto-play video
        if (videoContainer.requestFullscreen) {
          videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
          videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) {
          videoContainer.mozRequestFullScreen();
        } else if (videoContainer.msRequestFullscreen) {
          videoContainer.msRequestFullscreen();
        }
        setIsFullscreen(true);
        // Auto-play video when entering fullscreen
        if (!isPlaying) {
          dispatch(setVideoPlaying(true));
        }
      }
    } else if (playerRef.current && playerRef.current.wrapper) {
      console.log('Falling back to player wrapper');
      // Fallback to the player wrapper
      const playerWrapper = playerRef.current.wrapper;
      
      if (document.fullscreenElement) {
        console.log('Exiting fullscreen mode');
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        console.log('Entering fullscreen mode for player wrapper');
        if (playerWrapper.requestFullscreen) {
          playerWrapper.requestFullscreen();
        } else if (playerWrapper.webkitRequestFullscreen) {
          playerWrapper.webkitRequestFullscreen();
        } else if (playerWrapper.mozRequestFullScreen) {
          playerWrapper.mozRequestFullScreen();
        } else if (playerWrapper.msRequestFullscreen) {
          playerWrapper.msRequestFullscreen();
        }
        setIsFullscreen(true);
        if (!isPlaying) {
          dispatch(setVideoPlaying(true));
        }
      }
    } else {
      console.error('No suitable element found for fullscreen');
    }
  };

  // Safe access to current step
  const currentStepData = process.steps && process.steps[currentStep] ? process.steps[currentStep] : null;

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom>
        {process.title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: '60%' } }}>
          <Paper 
            elevation={3} 
            className="video-container"
            sx={{ 
              position: 'relative',
              paddingTop: '56.25%', // 16:9 aspect ratio
              height: 0,
              overflow: 'hidden'
            }}
          >
            {isGoogleDrive && googleDriveEmbedUrl ? (
              <iframe
                ref={iframeRef}
                src={googleDriveEmbedUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Google Drive Video"
                allowFullScreen={true}
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
              />
            ) : isYouTube && youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="YouTube Video"
                allowFullScreen={true}
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
              />
            ) : videoUrl && !videoError ? (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                playing={isPlaying}
                controls={true}
                width="100%"
                height="100%"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
                playsinline={false}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload',
                      disablePictureInPicture: false,
                      allowFullScreen: true,
                      webkitallowfullscreen: true,
                      mozallowfullscreen: true
                    },
                    forceVideo: true,
                    hlsOptions: {
                      enableFullscreen: true
                    }
                  },
                  youtube: {
                    playerVars: {
                      fs: 1, // Enable fullscreen button
                      modestbranding: 1,
                      allowfullscreen: 1,
                      playsinline: 0
                    },
                    embedOptions: {
                      allowFullScreen: true
                    }
                  }
                }}
                onError={(e) => {
                  console.error('Video player error:', e);
                  setVideoError(true);
                }}
              />
            ) : (
              // No valid video URL
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white'
                }}
              >
                <Typography variant="body1">
                  No video available for this step.
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1
              }}
            >
              <Box>
                <IconButton color="primary" onClick={handlePlayPause}>
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton color="primary" onClick={handleBack} disabled={currentStep === 0}>
                  <SkipPreviousIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={handleNext}
                  disabled={currentStep === process.steps.length - 1}
                >
                  <SkipNextIcon />
                </IconButton>
                <IconButton 
                  color="primary" 
                  onClick={openNativeFullscreen}
                  sx={{ 
                    bgcolor: 'rgba(0, 255, 0, 0.2)', 
                    '&:hover': { bgcolor: 'rgba(0, 255, 0, 0.3)' },
                    ml: 1
                  }}
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>
              {currentStepData && (
                <Typography variant="caption" sx={{ color: 'white' }}>
                  Step {currentStep + 1} of {process.steps.length}: {currentStepData.title}
                </Typography>
              )}
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton 
                  color="primary" 
                  onClick={handleFullscreen}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } 
                  }}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: '40%' } }}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Process Flow
            </Typography>
            <Stepper activeStep={currentStep} orientation="vertical">
              {process.steps && process.steps.map((step, index) => (
                <Step key={step.title || `step-${index}`}>
                  <StepLabel
                    onClick={() => handleStepChange(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {step.title}
                  </StepLabel>
                  <StepContent>
                    <Typography>{step.description}</Typography>
                    <Box sx={{ mb: 2, mt: 1 }}>
                      <div>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={index === process.steps.length - 1}
                        >
                          {index === process.steps.length - 1 ? 'Finish' : 'Continue'}
                        </Button>
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Back
                        </Button>
                      </div>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default FlowPlayer;
