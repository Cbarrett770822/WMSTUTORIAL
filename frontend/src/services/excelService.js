import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import config from '../config';
import axios from 'axios';

// Function to get the authentication token
const getAuthToken = () => {
  const token = localStorage.getItem('wms_auth_token');
  console.log('Auth token retrieved:', token ? 'Token exists' : 'No token found');
  return token;
};

/**
 * Service for handling Excel file operations
 */

// Generate and download a template Excel file for processes
export const downloadProcessTemplate = async () => {
  try {
    console.log('Starting process template download');
    // Fetch current processes data from the database
    const token = getAuthToken();
    console.log('Auth token available:', !!token);
    console.log('API URL:', `${config.apiUrl}/.netlify/functions/getProcesses`);
    
    // Make API request with or without token
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    console.log('Request headers:', headers);
    
    const response = await axios.get(`${config.apiUrl}/.netlify/functions/getProcesses`, { headers });
    
    // Create workbook with four sheets
    const wb = XLSX.utils.book_new();
    
    // Process sheet headers
    const processHeaders = [
      'id', 'title', 'name', 'description', 'category'
    ];
    
    // Process step sheet headers
    const stepHeaders = [
      'id', 'processId', 'title', 'description', 
      'order', 'videoUrl', 'imageUrl'
    ];
    
    // Benefits sheet headers
    const benefitsHeaders = [
      'processId', 'benefit'
    ];
    
    // Before/After sheet headers
    const beforeAfterHeaders = [
      'processId', 'beforeText', 'afterText'
    ];
    
    // Prepare data from the database
    console.log('Process API response:', response.data);
    
    // Extract processes from the response - API returns {success, processes, source, count}
    const processes = response.data.processes || [];
    
    console.log('Number of processes found:', processes.length);
    
    // Extract process data
    const processData = processes.length > 0 ? processes.map(process => {
      // MongoDB documents might have both _id and id fields
      return {
        id: process.id || process._id || '',
        title: process.title || '',
        name: process.name || '',
        description: process.description || '',
        category: process.category || ''
      };
    }) : [];
    
    // Extract steps data
    const stepsData = [];
    if (processes && processes.length > 0) {
      processes.forEach(process => {
        if (process && process.steps && Array.isArray(process.steps)) {
          process.steps.forEach(step => {
            if (step) {
              stepsData.push({
                id: step.id || step._id || '',
                processId: process.id || process._id || '',
                title: step.title || '',
                description: step.description || '',
                order: step.order || 0,
                videoUrl: step.videoUrl || '',
                imageUrl: step.imageUrl || ''
              });
            }
          });
        }
      });
    }
    console.log('Number of steps found:', stepsData.length);
    
    // Extract benefits data
    const benefitsData = [];
    if (processes && processes.length > 0) {
      processes.forEach(process => {
        if (process && process.benefits && Array.isArray(process.benefits)) {
          process.benefits.forEach(benefit => {
            if (benefit) {
              benefitsData.push({
                processId: process.id || process._id || '',
                benefit: benefit
              });
            }
          });
        }
      });
    }
    console.log('Number of benefits found:', benefitsData.length);
    
    // Extract before/after data
    const beforeAfterData = [];
    if (processes && processes.length > 0) {
      processes.forEach(process => {
        if (process && process.beforeAfter) {
          beforeAfterData.push({
            processId: process.id || process._id || '',
            beforeText: process.beforeAfter.before || '',
            afterText: process.beforeAfter.after || ''
          });
        }
      });
    }
    console.log('Number of before/after items found:', beforeAfterData.length);
    
    // If no data exists, provide empty arrays with headers
    const finalProcessData = processData.length > 0 ? processData : [{
      id: '',
      title: '',
      name: '',
      description: '',
      category: ''
    }];
    
    const finalStepsData = stepsData.length > 0 ? stepsData : [{
      id: '',
      processId: '',
      title: '',
      description: '',
      order: '',
      videoUrl: '',
      imageUrl: ''
    }];
    
    const finalBenefitsData = benefitsData.length > 0 ? benefitsData : [{
      processId: '',
      benefit: ''
    }];
    
    const finalBeforeAfterData = beforeAfterData.length > 0 ? beforeAfterData : [{
      processId: '',
      beforeText: '',
      afterText: ''
    }];
    
    // Create process sheet
    const processWs = XLSX.utils.json_to_sheet(finalProcessData, {
      header: processHeaders
    });
    
    // Add column widths
    const processColWidths = [
      { wch: 10 }, // id
      { wch: 20 }, // title
      { wch: 15 }, // name
      { wch: 40 }, // description
      { wch: 10 }  // category
    ];
    processWs['!cols'] = processColWidths;
    
    // Create steps sheet
    const stepsWs = XLSX.utils.json_to_sheet(finalStepsData, {
      header: stepHeaders
    });
    
    // Add column widths
    const stepsColWidths = [
      { wch: 10 }, // id
      { wch: 10 }, // processId
      { wch: 20 }, // title
      { wch: 40 }, // description
      { wch: 5 },  // order
      { wch: 30 }, // videoUrl
      { wch: 30 }, // imageUrl
    ];
    stepsWs['!cols'] = stepsColWidths;
    
    // Create benefits sheet
    const benefitsWs = XLSX.utils.json_to_sheet(finalBenefitsData, {
      header: benefitsHeaders
    });
    
    // Add column widths
    const benefitsColWidths = [
      { wch: 10 }, // processId
      { wch: 40 }  // benefit
    ];
    benefitsWs['!cols'] = benefitsColWidths;
    
    // Create before/after sheet
    const beforeAfterWs = XLSX.utils.json_to_sheet(finalBeforeAfterData, {
      header: beforeAfterHeaders
    });
    
    // Add column widths
    const beforeAfterColWidths = [
      { wch: 10 }, // processId
      { wch: 40 }, // beforeText
      { wch: 40 }  // afterText
    ];
    beforeAfterWs['!cols'] = beforeAfterColWidths;
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, processWs, 'Processes');
    XLSX.utils.book_append_sheet(wb, stepsWs, 'Steps');
    XLSX.utils.book_append_sheet(wb, benefitsWs, 'Benefits');
    XLSX.utils.book_append_sheet(wb, beforeAfterWs, 'BeforeAfter');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, 'wms_processes_template.xlsx');
  } catch (error) {
    console.error('Error fetching process data for Excel template:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    console.error('Error status:', error.response ? error.response.status : 'No status');
    
    // Fallback to empty template if fetch fails
    const wb = XLSX.utils.book_new();
    
    // Create empty sheets with headers
    const processWs = XLSX.utils.json_to_sheet([{
      id: '',
      title: '',
      name: '',
      description: '',
      category: ''
    }]);
    
    const stepsWs = XLSX.utils.json_to_sheet([{
      id: '',
      processId: '',
      title: '',
      description: '',
      order: '',
      videoUrl: '',
      imageUrl: ''
    }]);
    
    const benefitsWs = XLSX.utils.json_to_sheet([{
      processId: '',
      benefit: ''
    }]);
    
    const beforeAfterWs = XLSX.utils.json_to_sheet([{
      processId: '',
      beforeText: '',
      afterText: ''
    }]);
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, processWs, 'Processes');
    XLSX.utils.book_append_sheet(wb, stepsWs, 'Steps');
    XLSX.utils.book_append_sheet(wb, benefitsWs, 'Benefits');
    XLSX.utils.book_append_sheet(wb, beforeAfterWs, 'BeforeAfter');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, 'wms_processes_template.xlsx');
  }
};

// Generate and download a template Excel file for presentations
export const downloadPresentationTemplate = async () => {
  try {
    console.log('Starting presentation template download');
    // Fetch current presentations data from the database
    const token = getAuthToken();
    console.log('Auth token available:', !!token);
    console.log('API URL:', `${config.apiUrl}/.netlify/functions/getPresentations`);
    
    // Make API request with or without token
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    console.log('Request headers:', headers);
    
    const response = await axios.get(`${config.apiUrl}/.netlify/functions/getPresentations`, { headers });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Presentation sheet headers
    const presentationHeaders = [
      'id', 'title', 'description', 'localUrl', 'remoteUrl', 'type', 'tags'
    ];
    
    // Prepare data from the database
    console.log('Presentation API response:', response.data);
    
    // Extract presentations from the response - API returns {success, presentations, source, count}
    const presentations = response.data.presentations || [];
    
    // Format the presentations data
    console.log('Number of presentations found:', presentations.length);
    
    const presentationData = presentations.length > 0 ? presentations.map(presentation => {
      if (!presentation) return null;
      
      return {
        id: presentation.id || presentation._id || '',
        title: presentation.title || '',
        description: presentation.description || '',
        localUrl: presentation.localUrl || '',
        remoteUrl: presentation.remoteUrl || presentation.url || '',
        type: presentation.type || '',
        tags: Array.isArray(presentation.tags) ? presentation.tags.join(',') : (presentation.tags || '')
      };
    }).filter(item => item !== null) : [];
    
    // If no data exists, provide empty array with headers
    const finalPresentationData = presentationData.length > 0 ? presentationData : [{
      id: '',
      title: '',
      description: '',
      localUrl: '',
      remoteUrl: '',
      type: '',
      tags: ''
    }];
    
    // Create presentation sheet
    const presentationWs = XLSX.utils.json_to_sheet(finalPresentationData, {
      header: presentationHeaders
    });
    
    // Add column widths
    const presentationColWidths = [
      { wch: 15 }, // id
      { wch: 30 }, // title
      { wch: 40 }, // description
      { wch: 30 }, // localUrl
      { wch: 40 }, // remoteUrl
      { wch: 15 }, // type
      { wch: 30 }, // tags
    ];
    presentationWs['!cols'] = presentationColWidths;
    
    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, presentationWs, 'Presentations');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, 'wms_presentations_template.xlsx');
  } catch (error) {
    console.error('Error fetching presentation data for Excel template:', error);
    
    // Fallback to empty template if fetch fails
    const wb = XLSX.utils.book_new();
    
    // Create empty sheet with headers
    const presentationWs = XLSX.utils.json_to_sheet([{
      id: '',
      title: '',
      description: '',
      localUrl: '',
      remoteUrl: '',
      type: '',
      tags: ''
    }]);
    
    // Add column widths
    const presentationColWidths = [
      { wch: 15 }, // id
      { wch: 30 }, // title
      { wch: 40 }, // description
      { wch: 30 }, // localUrl
      { wch: 40 }, // remoteUrl
      { wch: 15 }, // type
      { wch: 30 }, // tags
    ];
    presentationWs['!cols'] = presentationColWidths;
    
    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, presentationWs, 'Presentations');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, 'wms_presentations_template.xlsx');
  }
};

// Upload Excel file to server
export const uploadExcelFile = async (file, dataType) => {
  try {
    // Read file as base64
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const base64data = e.target.result;
          
          const token = getAuthToken();
          if (!token) {
            throw new Error('Authentication required');
          }
          
          // Send to server
          const uploadUrl = `${config.apiUrl}/.netlify/functions/uploadExcelStandalone`;
          console.log('Uploading Excel file to:', uploadUrl);
          console.log('Data type:', dataType);
          console.log('API base URL from config:', config.apiUrl);
          console.log('Auth token available:', !!token);
          
          try {
            console.log('Attempting fetch to:', uploadUrl);
            const response = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                fileData: base64data,
                dataType
              })
            });
            
            console.log('Response received:', response.status, response.statusText);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Error response:', errorText);
              try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.error || 'Failed to upload file');
              } catch (jsonError) {
                throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
              }
            }
            
            const result = await response.json();
            console.log('Upload successful, result:', result);
            resolve(result);
          } catch (error) {
            console.error('Fetch error details:', error);
            reject(error);
          }
        } catch (error) {
          console.error('Overall error in file processing:', error);
          reject(error);
        }
      };
      
      reader.onerror = (event) => {
        console.error('File reading error:', event);
        const errorMsg = event.target.error
          ? `Failed to read file: ${event.target.error.message || event.target.error.name}` 
          : 'Failed to read file';
        reject(new Error(errorMsg));
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error uploading Excel file:', error);
    throw error;
  }
};
