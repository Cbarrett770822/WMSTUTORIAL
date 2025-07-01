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

const SimpleFlowPlayer = () => {
  const dispatch = useDispatch();
  const process = useSelector(selectSelectedProcess);
  const currentStep = useSelector(selectCurrentStep);
  const isPlaying = useSelector(state => state.processes.isVideoPlaying);
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Video URL state variables
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(null);
  const [isYouTube, setIsYouTube] = useState(false);

  // Reset video error state when current step changes
  useEffect(() => {
    setVideoError(false);
  }, [currentStep, process?.id]);
  
  // Extract YouTube video ID from URL
  const extractYoutubeId = (url) => {
    if (!url) return null;
    
    try {
      console.log('Extracting YouTube ID from URL:', url);
      
      // Simple approach - try several regex patterns to match different YouTube URL formats
      const patterns = [
        // Standard watch URLs: youtube.com/watch?v=ID
        new RegExp('(?:youtube\\.com\\/watch\\?(?:.*&)?v=|youtu\\.be\\/)([^&#?/]+)'),
        
        // Embed URLs: youtube.com/embed/ID
        new RegExp('youtube\\.com\\/embed\\/([^/?&]+)'),
        
        // Short URLs: youtu.be/ID
        new RegExp('youtu\\.be\\/([^/?&]+)'),
        
        // Live URLs: youtube.com/live/ID
        new RegExp('youtube\\.com\\/live\\/([^/?&]+)')
      ];
      
      // Try each pattern
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          const videoId = match[1];
          console.log('Extracted YouTube ID:', videoId, 'using pattern:', pattern);
          return videoId;
        }
      }
      
      // If all regex patterns fail, try URL parsing as a fallback
      try {
        const urlObj = new URL(url);
        
        // Format: youtube.com/watch?v=ID
        if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) {
          const videoId = urlObj.searchParams.get('v');
          if (videoId) {
            console.log('Extracted YouTube ID from URL params:', videoId);
            return videoId;
          }
        }
        
        // Format: youtube.com/something/ID
        // This is a last resort for any YouTube URL format
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
          const pathParts = urlObj.pathname.split('/');
          // Get the last non-empty path segment
          const lastPart = pathParts.filter(part => part).pop();
          if (lastPart && lastPart.length > 5) { // YouTube IDs are typically 11 chars
            console.log('Last resort extraction - path segment:', lastPart);
            return lastPart;
          }
        }
      } catch (urlError) {
        console.warn('URL parsing fallback failed:', urlError);
      }
      
      console.warn('Could not extract YouTube ID from URL:', url);
      return null;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
    }
  };

  // Update video URL when current step changes
  useEffect(() => {
    if (process && process.steps && process.steps[currentStep]) {
      const currentStepData = process.steps[currentStep];
      const rawVideoUrl = currentStepData.videoUrl || '';
      
      console.log('Current step video URL:', rawVideoUrl);
      
      // Reset state
      setIsYouTube(false);
      setYoutubeEmbedUrl(null);
      setVideoUrl('');
      
      // Check if it's a YouTube URL
      if (rawVideoUrl && (
          rawVideoUrl.includes('youtube.com') || 
          rawVideoUrl.includes('youtu.be')
      )) {
        setIsYouTube(true);
        
        // Extract YouTube video ID
        const youtubeId = extractYoutubeId(rawVideoUrl);
        console.log('Extracted YouTube ID:', youtubeId);
        
        if (youtubeId) {
          // Construct YouTube embed URL
          const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&modestbranding=1&origin=${window.location.origin}`;
          console.log('YouTube embed URL:', embedUrl);
          setYoutubeEmbedUrl(embedUrl);
        } else {
          console.error('Failed to extract YouTube ID from URL:', rawVideoUrl);
          setVideoError(true);
        }
      } 
      // Not a YouTube URL, use as is
      else if (rawVideoUrl) {
        setVideoUrl(rawVideoUrl);
      }
    }
  }, [currentStep, process]);

  // Handle step change
  const handleStepChange = (step) => {
    dispatch(setCurrentStep(step));
  };

  // Handle next step
  const handleNext = () => {
    dispatch(nextStep());
  };

  // Handle previous step
  const handleBack = () => {
    dispatch(previousStep());
  };

  // Handle play/pause
  const handlePlayPause = () => {
    dispatch(setVideoPlaying(!isPlaying));
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // If no process is selected
  if (!process) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">No process selected.</Typography>
      </Box>
    );
  }

  // Get current step data
  const currentStepData = process.steps && process.steps[currentStep];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h5" gutterBottom>
        {process.title || process.name || 'Process Flow'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: '60%' }, position: 'relative' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              position: 'relative',
              height: 0,
              paddingTop: '56.25%', // 16:9 aspect ratio
              bgcolor: 'black'
            }}
            ref={videoContainerRef}
          >
            {isYouTube && youtubeEmbedUrl ? (
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
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
              />
            ) : videoUrl ? (
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
                onError={(e) => {
                  console.error('Video playback error:', e);
                  setVideoError(true);
                }}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload'
                    }
                  }
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
              </Box>
              {currentStepData && (
                <Typography variant="caption" sx={{ color: 'white' }}>
                  Step {currentStep + 1} of {process.steps.length}: {currentStepData.title}
                </Typography>
              )}
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton color="primary" onClick={handleFullscreen}>
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

export default SimpleFlowPlayer;
