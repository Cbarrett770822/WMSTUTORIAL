import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchProcesses } from '../../features/processes/processesSlice';
import { fetchPresentations } from '../../features/presentations/presentationsSlice';
import { uploadExcelFile } from '../../services/excelService';
// showNotification is received as a prop
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const ExcelImportComponent = ({ showNotification }) => {
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dataType, setDataType] = useState('processes');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setSelectedFile(null);
        setUploadError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Handle data type selection
  const handleDataTypeChange = (event) => {
    setDataType(event.target.value);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      console.log('Starting Excel upload for data type:', dataType);
      const result = await uploadExcelFile(selectedFile, dataType);
      console.log('Excel upload successful:', result);
      setUploadResult(result);
      showNotification(`Successfully imported ${result.count} ${dataType}`, 'success');
      
      // Clear localStorage cache to ensure we get fresh data
      console.log('Clearing localStorage cache for', dataType);
      if (dataType === 'processes') {
        localStorage.removeItem('wms_processes');
      } else if (dataType === 'presentations') {
        localStorage.removeItem('wms_presentations');
      }
      
      // Refresh data from database to ensure UI shows the latest data
      if (dataType === 'processes') {
        console.log('Refreshing processes data after Excel upload');
        try {
          await dispatch(fetchProcesses({ bypassCache: true })).unwrap();
          console.log('Successfully refreshed processes data');
        } catch (fetchError) {
          console.error('Error refreshing processes data:', fetchError);
        }
      } else if (dataType === 'presentations') {
        console.log('Refreshing presentations data after Excel upload');
        try {
          await dispatch(fetchPresentations({ bypassCache: true })).unwrap();
          console.log('Successfully refreshed presentations data');
        } catch (fetchError) {
          console.error('Error refreshing presentations data:', fetchError);
        }
      }
      
      // Force a page reload to ensure all components reflect the new data
      console.log('Forcing page reload to refresh all components');
      window.location.reload();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
      showNotification('Failed to import data. Please check the file format.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Import Excel Data
      </Typography>
      
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Data Type</FormLabel>
        <RadioGroup
          row
          name="dataType"
          value={dataType}
          onChange={handleDataTypeChange}
        >
          <FormControlLabel value="processes" control={<Radio />} label="Processes" />
          <FormControlLabel value="presentations" control={<Radio />} label="Presentations" />
        </RadioGroup>
      </FormControl>
      
      <Box sx={{ mb: 2 }}>
        <input
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          id="excel-file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label htmlFor="excel-file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUploadIcon />}
            disabled={isUploading}
          >
            Select Excel File
          </Button>
        </label>
        {selectedFile && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: {selectedFile.name}
          </Typography>
        )}
      </Box>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        sx={{ mr: 2 }}
      >
        {isUploading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
      
      {uploadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {uploadError}
        </Alert>
      )}
      
      {uploadResult && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully imported {uploadResult.count} {dataType}
        </Alert>
      )}
    </Paper>
  );
};

export default ExcelImportComponent;
