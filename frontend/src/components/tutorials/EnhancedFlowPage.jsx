import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { 
  selectProcess, 
  selectSelectedProcess,
  selectCurrentStep,
  setCurrentStep,
  nextStep,
  previousStep
} from '../../features/processes/processesSlice';
import BenefitsCard from './BenefitsCard';

const EnhancedFlowPage = () => {
  const { processId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const process = useSelector(selectSelectedProcess);
  const currentStep = useSelector(selectCurrentStep);
  
  // Video URL state variables
  const [videoUrl, setVideoUrl] = React.useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = React.useState(null);
  const [isYouTube, setIsYouTube] = React.useState(false);
  const [isTeamsLink, setIsTeamsLink] = React.useState(false);
  const [teamsUrl, setTeamsUrl] = React.useState('');
  const [isSharePointLink, setIsSharePointLink] = React.useState(false);
  const [sharePointUrl, setSharePointUrl] = React.useState('');
  const [hasVideo, setHasVideo] = React.useState(false);

  useEffect(() => {
    // Select the process based on the URL parameter
    if (processId) {
      // The processId from the URL will be used to find the process
      dispatch(selectProcess(processId));
    }
  }, [processId, dispatch]);

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
      
      if (rawVideoUrl) {
        setHasVideo(true);
        setVideoUrl(rawVideoUrl);
        
        // Check if it's a YouTube URL
        const youtubeId = extractYoutubeId(rawVideoUrl);
        if (youtubeId) {
          console.log('YouTube video ID:', youtubeId);
          setIsYouTube(true);
          setYoutubeEmbedUrl(`https://www.youtube.com/embed/${youtubeId}`);
        }
        
        // Check if it's a Teams link
        if (checkIfTeamsLink(rawVideoUrl)) {
          console.log('Teams link detected');
          setIsTeamsLink(true);
          setTeamsUrl(rawVideoUrl);
        }
        
        // Check if it's a SharePoint link
        if (checkIfSharePointLink(rawVideoUrl)) {
          console.log('SharePoint link detected');
          setIsSharePointLink(true);
          setSharePointUrl(rawVideoUrl);
        }
      }
    }
  }, [process, currentStep]);

  const handleBackClick = () => {
    navigate('/processes');
  };

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
    if (isYouTube && youtubeEmbedUrl) {
      window.open(youtubeEmbedUrl, '_blank');
    } else if (isTeamsLink && teamsUrl) {
      window.open(teamsUrl, '_blank');
    } else if (isSharePointLink && sharePointUrl) {
      window.open(sharePointUrl, '_blank');
    } else if (videoUrl) {
      // For other video types, open in a new window with a simple player
      const newWindow = window.open('', '_blank');
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

  if (!process) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">
            Process not found. Please select a valid process.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{ mt: 2 }}
          >
            Back to Processes
          </Button>
        </Box>
      </Container>
    );
  }

  // Get current step data
  const currentStepData = process.steps && process.steps[currentStep];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
        >
          Back to Processes
        </Button>
      </Box>

      <Typography variant="h5" gutterBottom>
        {process.title || process.name || 'Process Flow'} - Enhanced Layout
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* Process Steps - Left side */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
        
        {/* Benefits Card - Right side */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <BenefitsCard process={process} />
        </Box>
      </Box>
      
      {/* Video URL Link - displayed at the bottom of the page */}
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
    </Container>
  );
};

export default EnhancedFlowPage;
