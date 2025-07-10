import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Link
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  selectSelectedProcess,
  selectCurrentStep,
  setCurrentStep,
  nextStep,
  previousStep
} from '../../features/processes/processesSlice';

const SimpleFlowPlayer = () => {
  const dispatch = useDispatch();
  const process = useSelector(selectSelectedProcess);
  const currentStep = useSelector(selectCurrentStep);
  
  // Video URL state variables
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isTeamsLink, setIsTeamsLink] = useState(false);
  const [teamsUrl, setTeamsUrl] = useState('');
  const [isSharePointLink, setIsSharePointLink] = useState(false);
  const [sharePointUrl, setSharePointUrl] = useState('');
  const [hasVideo, setHasVideo] = useState(false);

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
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (urlError) {
        console.warn('URL parsing fallback failed:', urlError);
        return null;
      }
      
      // Format: youtube.com/watch?v=ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          console.log('Extracted YouTube ID from URL params:', videoId);
          return videoId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return null;
    }
  };
  
  // Check if URL is a Microsoft Teams link
  const checkIfTeamsLink = (url) => {
    return url && (
      url.includes('teams.microsoft.com') || 
      url.includes('microsoftteams.com') ||
      url.toLowerCase().includes('teams')
    );
  };
  
  // Check if URL is a SharePoint link
  const checkIfSharePointLink = (url) => {
    return url && (
      url.includes('sharepoint.com') ||
      url.includes('.sp.') ||
      url.toLowerCase().includes('sharepoint')
    );
  };

  // Process video URL when current step changes
  useEffect(() => {
    if (process && process.steps && process.steps[currentStep]) {
      const currentStepData = process.steps[currentStep];
      const rawVideoUrl = currentStepData.videoUrl || '';
      
      console.log('Current step video URL:', rawVideoUrl);
      
      // Reset state
      setIsYouTube(false);
      setYoutubeEmbedUrl(null);
      setVideoUrl('');
      setIsTeamsLink(false);
      setTeamsUrl('');
      setIsSharePointLink(false);
      setSharePointUrl('');
      setHasVideo(false);
      
      if (!rawVideoUrl) {
        console.log('No video URL for this step');
        return;
      }
      
      // Set hasVideo to true if there's any video URL
      setHasVideo(true);
      
      // Check if it's a YouTube URL
      if (rawVideoUrl.includes('youtube.com') || rawVideoUrl.includes('youtu.be')) {
        console.log('Detected YouTube URL:', rawVideoUrl);
        setIsYouTube(true);
        
        const youtubeId = extractYoutubeId(rawVideoUrl);
        if (youtubeId) {
          // Set autoplay=1 since we'll open in a new tab
          const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
          console.log('Setting YouTube embed URL:', embedUrl);
          setYoutubeEmbedUrl(embedUrl);
        }
      } 
      // Check if it's a Microsoft Teams link
      else if (checkIfTeamsLink(rawVideoUrl)) {
        console.log('Detected Microsoft Teams video link:', rawVideoUrl);
        setIsTeamsLink(true);
        setTeamsUrl(rawVideoUrl);
      }
      // Check if it's a SharePoint link
      else if (checkIfSharePointLink(rawVideoUrl)) {
        console.log('Detected SharePoint link:', rawVideoUrl);
        setIsSharePointLink(true);
        setSharePointUrl(rawVideoUrl);
      }
      // Not a YouTube, Teams, or SharePoint URL, use as is
      else {
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

  // Handle playing video in a new tab based on video type
  const handlePlayVideo = () => {
    console.log('Playing video in new tab');
    
    if (isSharePointLink && sharePointUrl) {
      console.log('Opening SharePoint link:', sharePointUrl);
      window.open(sharePointUrl, '_blank', 'noopener,noreferrer');
    } else if (isTeamsLink && teamsUrl) {
      console.log('Opening Teams link:', teamsUrl);
      window.open(teamsUrl, '_blank', 'noopener,noreferrer');
    } else if (isYouTube && youtubeEmbedUrl) {
      console.log('Opening YouTube video:', youtubeEmbedUrl);
      window.open(youtubeEmbedUrl, '_blank', 'noopener,noreferrer');
    } else if (videoUrl) {
      console.log('Opening direct video URL:', videoUrl);
      // For direct video URLs, create a simple HTML page that embeds the video
      const newWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Video Player</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #000; }
                video { width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <video controls autoplay src="${videoUrl}"></video>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
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
        <Box sx={{ width: '100%' }}>
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
                        {hasVideo && (
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={handlePlayVideo}
                            startIcon={<PlayArrowIcon />}
                            sx={{ mt: 1, mr: 1 }}
                          >
                            Play
                          </Button>
                        )}
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
      
      {/* Video URL Link - now displayed at the bottom of the page */}
      {hasVideo && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Video URL:
          </Typography>
          <Link 
            href={sharePointUrl || teamsUrl || videoUrl || youtubeEmbedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ wordBreak: 'break-all', fontSize: '0.875rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {sharePointUrl || teamsUrl || videoUrl || (youtubeEmbedUrl && youtubeEmbedUrl.split('?')[0])}
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default SimpleFlowPlayer;
