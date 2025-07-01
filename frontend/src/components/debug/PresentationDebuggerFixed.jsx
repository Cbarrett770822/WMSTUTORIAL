import React, { useState, useEffect } from 'react';
import { fetchPresentations } from '../../services/apiService';
import { getPresentations } from '../../services/presentationService';

const PresentationDebugger = () => {
  const [apiData, setApiData] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get data directly from API
        console.log('Fetching data directly from API...');
        const apiResponse = await fetchPresentations();
        setApiData(apiResponse);
        
        // Get data through the service layer
        console.log('Fetching data through service layer...');
        const serviceResponse = await getPresentations();
        setServiceData(serviceResponse);
        
      } catch (err) {
        console.error('Error in PresentationDebugger:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Clear localStorage for testing
      localStorage.removeItem('wms_presentations');
      console.log('Cleared localStorage presentations');
      
      // Get data directly from API
      const apiResponse = await fetchPresentations();
      setApiData(apiResponse);
      
      // Get data through the service layer
      const serviceResponse = await getPresentations();
      setServiceData(serviceResponse);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="presentation-debugger">
      <h2>Presentation Data Debugger</h2>
      
      <div className="actions">
        <button onClick={refreshData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      <div className="data-display">
        <div className="data-column">
          <h3>API Response (Direct)</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <pre>{JSON.stringify(apiData, null, 2)}</pre>
          )}
        </div>
        
        <div className="data-column">
          <h3>Service Response (getPresentations)</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <pre>{JSON.stringify(serviceData, null, 2)}</pre>
          )}
        </div>
      </div>
      
      <div className="localStorage-info">
        <h3>localStorage Content</h3>
        <pre>
          {JSON.stringify(
            {
              wms_presentations: localStorage.getItem('wms_presentations')
                ? JSON.parse(localStorage.getItem('wms_presentations'))
                : null
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};

export default PresentationDebugger;
