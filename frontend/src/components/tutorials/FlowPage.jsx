import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Button,
  Divider,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SimpleFlowPlayer from './SimpleFlowPlayer_new';
import { 
  selectProcess, 
  selectSelectedProcess 
} from '../../features/processes/processesSlice';

const FlowPage = () => {
  const { processId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const process = useSelector(selectSelectedProcess);

  useEffect(() => {
    // Select the process based on the URL parameter
    if (processId) {
      // The processId from the URL will be used to find the process
      // Our updated selectProcess reducer will handle both id and _id
      dispatch(selectProcess(processId));
    }
  }, [processId, dispatch]);

  const handleBackClick = () => {
    navigate('/processes');
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

      <SimpleFlowPlayer />
    </Container>
  );
};

export default FlowPage;
