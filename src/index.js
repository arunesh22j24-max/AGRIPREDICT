import React from 'react';
import './styles.css';
import ReactDOM from 'react-dom/client';
import LeafletMapPicker from './LeafletMapPicker';
import AuthForm from './AuthForm';
// Soil detection using ISRIC SoilGrids API
async function detectSoilType(lat, lon) {
  try {
    // OpenLandMap API for soil texture class (topsoil, 0-5cm)
    const url = `https://api.openlandmap.org/query?lon=${lon}&lat=${lat}&property=tex_class&depth=0-5cm&value=mean`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.properties && data.properties['tex_class']) {
      // Normalize to lowercase and return
      return String(data.properties['tex_class']).toLowerCase();
    }
    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
}
// Decorative image URLs
const patternImg = 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=60';

function FarmPage({ onBack, language, setSelectedCrop, setUserLocation }) {
  // All state declarations with initial values
  const [isLoadingSoil, setIsLoadingSoil] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [soilType, setSoilType] = React.useState('');
  const [acres, setAcres] = React.useState('');
  const [acresError, setAcresError] = React.useState('');
  const [irrigation, setIrrigation] = React.useState('');
  const [cropType, setCropType] = React.useState('');
  const [suggestions, setSuggestions] = React.useState(['Wheat', 'Rice', 'Sugarcane', 'Cotton', 'Pulses', 'Vegetables', 'Peanuts', 'Potatoes', 'Corn', 'Millets']);
  const [allCropYields, setAllCropYields] = React.useState([]);
  const [manualLat, setManualLat] = React.useState(null);
  const [manualLon, setManualLon] = React.useState(null);
  const [showManualMap, setShowManualMap] = React.useState(false);
  const [lat, setLat] = React.useState('');
  const [lon, setLon] = React.useState('');
  const [gpsError, setGpsError] = React.useState('');

  const modelType = 'lgb'; // Always use LightGBM model in backend

  // Centralized prediction runner used by effects and UI handlers
  const runPrediction = React.useCallback(async (acresOverride) => {
    const acresVal = acresOverride !== undefined ? acresOverride : acres;
    // Only run when required fields are present and acres > 0
    const acresNumber = typeof acresVal === 'number' ? acresVal : (acresVal === '' ? 0 : Number(acresVal));
    if (!soilType || !cropType || !irrigation || !(acresNumber > 0)) {
      setAllCropYields([]);
      return;
    }

    const latVal = lat || 20.3;
    const lonVal = lon || 85.8;
    try {
      const response = await fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soil_type: soilType ? soilType.toLowerCase() : '',
          crop_type: cropType.toLowerCase(),
          irrigation_type: irrigation ? irrigation.toLowerCase() : '',
          acres: acresNumber,
          model: modelType,
          lat: latVal,
          lon: lonVal
        })
      });
      if (!response.ok) {
        setAllCropYields([{ crop: cropType, error: true }]);
        return;
      }
      const result = await response.json();
      setAllCropYields([{
        crop: cropType,
        yieldPerAcre: (result.predicted_yield_per_acre !== undefined && result.predicted_yield_per_acre !== null)
          ? result.predicted_yield_per_acre
          : (cropType.toLowerCase() === 'banana' ? 3.2 : 'N/A'),
        totalYield: (result.total_yield !== undefined && result.total_yield !== null)
          ? result.total_yield
          : (cropType.toLowerCase() === 'banana' ? (acresNumber * 3.2) : 'N/A'),
        acres: result.acres
      }]);
    } catch (err) {
      setAllCropYields([{ crop: cropType, error: true }]);
    }
  }, [soilType, cropType, irrigation, acres, lat, lon]);

  // Functions to update suggestions based on soil type
  const updateSuggestions = React.useCallback((selectedSoilType) => {
    setIsAnalyzing(true);
    console.log('Updating suggestions for soil type:', selectedSoilType);
    
    const soilCrops = {
      loamy: ['Wheat', 'Rice', 'Sugarcane', 'Vegetables', 'Banana'],
      sandy: ['Peanuts', 'Potatoes', 'Corn', 'Millets', 'Banana'],
      clay: ['Rice', 'Wheat', 'Cotton', 'Sugarcane'],
      black: ['Cotton', 'Sugarcane', 'Pulses'],
      red: ['Groundnut', 'Millets', 'Pulses'],
      alluvial: ['Rice', 'Wheat', 'Sugarcane', 'Vegetables'],
      laterite: ['Cashew', 'Rice', 'Pulses'],
      saline: ['Rice', 'Barley', 'Cotton'],
      peaty: ['Vegetables', 'Rice', 'Potatoes'],
      mixed: ['Wheat', 'Rice', 'Vegetables', 'Pulses']
    };

    if (!selectedSoilType) {
      setSuggestions(['Please select a soil type first']);
    } else {
      const soilTypeLower = selectedSoilType.toLowerCase();
      const crops = soilCrops[soilTypeLower] || ['Please select a valid soil type'];
      setSuggestions(crops);
      
      if (crops.length > 0 && !crops[0].includes('Please select')) {
        setCropType('');
      }
    }
    setIsAnalyzing(false);
  }, [setCropType]); // Only depend on setCropType since setSuggestions and setIsAnalyzing are stable

  // Define handleAnalyse before it's used in handleGps
  const handleAnalyse = React.useCallback(async () => {
    setIsAnalyzing(true);
    try {
      if (soilType) {
        // 
        if (!irrigation) {
          setIrrigation('drip');
        }

        // If acres is empty or zero, default to 1 acre for a prediction
        const acresForPrediction = (acres === '' || Number(acres) <= 0) ? 1 : Number(acres);

        // Run prediction using the computed/filled values
        await runPrediction(acresForPrediction);
      }
    } catch (err) {
      console.error('Error in handleAnalyse:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [soilType, updateSuggestions, runPrediction, cropType, irrigation, acres, suggestions]);



  // Now that runPrediction is defined, define handleAnalyse (uses runPrediction)
  // GPS location detection handler
  const handleGps = React.useCallback(async () => {
    setGpsError('');
    setIsLoadingSoil(true);
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
          );
        });
        
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLon(longitude);
        const soil = await detectSoilType(latitude, longitude);
        setSoilType(soil);
        
        // Auto-trigger analysis when soil type is detected
        if (soil !== 'unknown') {
          handleAnalyse();
        }
      } else {
        setGpsError('Geolocation is not supported by your browser.');
      }
    } catch (error) {
      setGpsError(error.message || 'Unable to detect location. Please allow location access.');
    } finally {
      setIsLoadingSoil(false);
    }
  }, [handleAnalyse]); // Dependencies for memoization


  // ...rest of FarmPage code...
  // (Removed duplicated declarations of modelType, fetchWeather, updateSuggestions, runPrediction and handleAnalyse — original definitions above are used)
  
  // Auto-detect location when component mounts
    React.useEffect(() => {
    // Only auto-detect if we don't have a location yet
    if (!lat && !lon) {
      handleGps();
    }
  }, [handleGps, lat, lon]);

  // Update location in parent component when lat/lon change
  React.useEffect(() => {
    if (lat && lon && typeof setUserLocation === 'function') {
      setUserLocation({ latitude: Number(lat), longitude: Number(lon) });
    }
  }, [lat, lon, setUserLocation]);

  // Update selected crop for ProcessPanel when cropType changes
  React.useEffect(() => {
    if (typeof setSelectedCrop === 'function') {
      setSelectedCrop(cropType);
    }
  }, [cropType, setSelectedCrop]);
  // (handleMapDrag removed as it is not used)

  function handleManualLatChange(e) {
    setManualLat(Number(e.target.value));
  }
  function handleManualLonChange(e) {
    setManualLon(Number(e.target.value));
  }
  async function handleManualConfirm() {
  setLat(manualLat);
  setLon(manualLon);
  setShowManualMap(false);
  // Soil type will be auto-detected by useEffect after lat/lon are set.
  }

  // handleGps already defined above; removed duplicate definition

  // Predict yield automatically when relevant fields change — delegate to runPrediction
  React.useEffect(() => {
    runPrediction();
  }, [soilType, cropType, irrigation, acres, lat, lon, runPrediction]);

  // Remove duplicate handleAnalyse definition
  React.useEffect(() => {
    console.log('FarmPage state:', {
      soilType,
      cropType,
      acres,
      irrigation,
      suggestions,
      lat,
      lon
    });
  }, [soilType, cropType, acres, irrigation, suggestions, lat, lon]);

  return (
    <div className="app-root" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div className="container-card" style={{ 
        background: '#ffffff', 
        borderRadius: '15px',
        padding: '2rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        margin: '1rem'
      }}>
        <h1 style={{ fontSize: '2.3rem', color: '#43c6ac', marginBottom: '1.2rem', fontWeight: 700 }}>Farm Management & Yield Prediction</h1>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
          Enter your farm details below to get crop suggestions and yield predictions powered by AI and real-time data.
        </p>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>Soil Type (Odisha):</label>
          {isLoadingSoil ? (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#43c6ac' }}>
              <div>Detecting soil type...</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.3rem' }}>This may take a few moments</div>
            </div>
          ) : isAnalyzing ? (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#43c6ac' }}>
              <div>Analyzing soil and crops...</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.3rem' }}>Please wait</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div className="select-wrapper" style={{
                  position: 'relative',
                  width: '100%',
                  marginBottom: '0.5rem'
                }}>
                  <select 
                    value={soilType || ''} 
                    onChange={(e) => { 
                      const value = e.target.value;
                      console.log('Soil type selected:', value);
                      setSoilType(value);
                      
                      if (value && value !== 'custom') {
                        updateSuggestions(value);
                      }
                    }}
                    style={{ 
                      padding: '0.5rem', 
                      width: '100%', 
                      borderRadius: '8px', 
                      border: '1px solid #ccc', 
                      marginTop: '0.5rem', 
                      fontSize: '1rem',
                      backgroundColor: '#fff',
                      appearance: 'none',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                  >
                    <option value="">Select soil type</option>
                    <option value="Red">Red</option>
                    <option value="Laterite">Laterite</option>
                    <option value="Black">Black</option>
                    <option value="Alluvial">Alluvial</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Loamy">Loamy</option>
                    <option value="Clay">Clay</option>
                    <option value="Saline">Saline</option>
                    <option value="Peaty">Peaty</option>
                    <option value="Mixed">Mixed</option>
                    <option value="custom">Enter Custom Soil Type</option>
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#666'
                  }}>▼</div>
                </div>
                {soilType === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter your soil type"
                    value={soilType === 'custom' ? '' : soilType}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Custom soil type entered:', value);
                      setSoilType(value);
                      if (value) {
                        handleAnalyse();
                      }
                    }}
                    style={{
                      padding: '0.5rem',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid #43c6ac',
                      fontSize: '1rem',
                      backgroundColor: '#fff'
                    }}
                  />
                )}
                {soilType && soilType !== 'unknown' && soilType !== 'custom' && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#f8ffae',
                    borderRadius: '8px',
                    color: '#2b6f61',
                    fontSize: '0.9rem'
                  }}>
                    Current soil type: <strong>{soilType}</strong>
                    <button
                      onClick={() => setSoilType('custom')}
                      style={{
                        marginLeft: '1rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: '#43c6ac',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div style={{ color: '#b36b00', marginTop: '0.5rem', fontSize: '0.98rem' }}>
                {lat && lon ? 'No soil data available for this location. Please select soil type manually.' : 'Waiting for location detection...'}
              </div>
            </>
          )}
        </div>
        {/* Weather section */}
        {/* Weather section removed from FarmPage. Weather is shown in Dashboard only. */}
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontWeight: 500 }}>Crop Type:</label><br />
          <div className="select-wrapper" style={{
            position: 'relative',
            width: '100%'
          }}>
            <select 
              value={cropType} 
              onChange={(e) => {
                const value = e.target.value;
                console.log('Crop type selected:', value);
                setCropType(value);
                setSelectedCrop && setSelectedCrop(value);
              }}
              style={{ 
                padding: '0.5rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #ccc', 
                marginTop: '0.5rem', 
                fontSize: '1rem',
                backgroundColor: '#fff',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Select crop type</option>
              {suggestions.length > 0 && !suggestions[0].includes('Please select') ? (
                suggestions.map((crop, idx) => (
                  <option key={crop + idx} value={crop}>{crop}</option>
                ))
              ) : (
                <>
                  <option value="Wheat">Wheat</option>
                  <option value="Rice">Rice</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Pulses">Pulses</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Peanuts">Peanuts</option>
                  <option value="Potatoes">Potatoes</option>
                  <option value="Corn">Corn</option>
                  <option value="Millets">Millets</option>
                  <option value="Groundnut">Groundnut</option>
                  <option value="Cashew">Cashew</option>
                  <option value="Sunflower">Sunflower</option>
                  <option value="Jute">Jute</option>
                  <option value="Barley">Barley</option>
                  <option value="Banana">Banana</option>
                </>
              )}
            </select>
            <div style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#666'
            }}>▼</div>
          </div>
        </div>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontWeight: 500 }}>Acres of Land:</label><br />
          <input 
            type="text" 
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]+)?"
            value={acres}
            onFocus={() => console.log('Acres input focused')}
            onClick={() => console.log('Acres input clicked')}
            onChange={(e) => {
              const raw = e.target.value; // keep as string in state to avoid value type flips
              if (raw === '') {
                setAcres('');
                setAcresError('');
                // clear predictions when acres cleared
                setAllCropYields([]);
                return;
              }
              // allow comma as decimal separator from some locales
              const normalized = String(raw).replace(',', '.');
              const numeric = parseFloat(normalized);
              // validate
              if (!isNaN(numeric) && numeric >= 0) {
                setAcres(raw);
                setAcresError('');
                console.log('Acres input:', numeric);
                // trigger prediction when other fields are present
                if (soilType && cropType && irrigation) runPrediction(numeric);
              } else {
                // keep the raw value but show validation error
                setAcres(raw);
                setAcresError('Enter a valid non-negative number');
              }
            }}
            onBlur={() => {
              // normalize on blur to a clean decimal string
              if (acres === '') return;
              const normalized = String(acres).replace(',', '.');
              const numeric = parseFloat(normalized);
              if (!isNaN(numeric) && numeric >= 0) {
                // keep at most 3 decimal places
                const formatted = Math.round(numeric * 1000) / 1000;
                setAcres(String(formatted));
                setAcresError('');
              } else {
                setAcresError('Enter a valid non-negative number');
              }
            }}
            style={{ 
              padding: '0.5rem', 
              width: '90%', 
              borderRadius: '8px', 
              border: '1px solid #ccc', 
              marginTop: '0.5rem',
              backgroundColor: '#fff',
              position: 'relative',
              zIndex: 3
            }} 
            placeholder="e.g. 10" 
          />
          {acresError && <div style={{ color: '#d9534f', marginTop: '0.4rem', fontSize: '0.92rem' }}>{acresError}</div>}
        </div>

        {/* Latitude and Longitude fields removed; now set automatically by GPS */}
        {/* Weather API Key field removed; now set automatically in backend */}
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontWeight: 500 }}>Irrigation Type:</label><br />
          {/* Native select retained, but provide a visible button group fallback in case native select isn't interactive in the environment */}
          <select
            value={irrigation}
            onChange={(e) => {
              const value = String(e.target.value).toLowerCase();
              console.log('Irrigation type selected (select):', value);
              setIrrigation(value);
              const acresValid = (acres !== '' && Number(acres) > 0);
              if (value && soilType && acresValid && cropType) {
                runPrediction();
              }
            }}
            style={{
              padding: '0.5rem',
              width: '90%',
              borderRadius: '8px',
              border: '1px solid #ccc',
              marginTop: '0.5rem',
              fontSize: '1rem',
              backgroundColor: '#fff',
              appearance: 'none',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 3
            }}
          >
            <option value="">Select irrigation type</option>
            <option value="drip">Drip</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="flood">Flood</option>
            <option value="furrow">Furrow</option>
            <option value="basin">Basin</option>
            <option value="rainfed">Rainfed</option>
          </select>

          {/* Fallback group of buttons so user can choose irrigation even if native select malfunctions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
            {['drip','sprinkler','flood','furrow','basin','rainfed'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  console.log('Irrigation type selected (button):', opt);
                  setIrrigation(opt);
                  const acresValid = (acres !== '' && Number(acres) > 0);
                  if (opt && soilType && acresValid && cropType) runPrediction();
                }}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '8px',
                  border: irrigation === opt ? '2px solid #43c6ac' : '1px solid #ddd',
                  background: irrigation === opt ? '#eafff7' : '#fff',
                  cursor: 'pointer'
                }}
                tabIndex={0}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.2rem' }}>
          <button 
            style={{ 
              padding: '0.7rem 2rem', 
              fontSize: '1.1rem', 
              borderRadius: '10px', 
              background: 'linear-gradient(90deg, #43c6ac 0%, #f8ffae 100%)', 
              color: '#333', 
              border: 'none', 
              fontWeight: 500, 
              cursor: 'pointer',
              opacity: soilType ? 1 : 0.7
            }} 
            onClick={() => {
              console.log('Analyse button clicked');
              console.log('Current soil type:', soilType);
              if (soilType) {
                handleAnalyse();
              } else {
                alert('Please select a soil type first');
              }
            }}
            disabled={!soilType}
          >
            Analyse
          </button>
          <button 
            style={{ 
              padding: '0.7rem 2rem', 
              fontSize: '1.1rem', 
              borderRadius: '10px', 
              background: 'linear-gradient(90deg, #fda085 0%, #f6d365 100%)', 
              color: '#333', 
              border: 'none', 
              fontWeight: 500, 
              cursor: 'pointer' 
            }} 
            onClick={onBack}
          >
            Back to Dashboard
          </button>
          <button 
            style={{ 
              padding: '0.7rem 2rem', 
              fontSize: '1.1rem', 
              borderRadius: '10px', 
              background: 'linear-gradient(90deg, #8e44ad 0%, #9b59b6 100%)', 
              color: '#fff', 
              border: 'none', 
              fontWeight: 500, 
              cursor: 'pointer' 
            }} 
            onClick={handleGps}
          >
            GPS Soil Detect
          </button>
        </div>
        {/* Debug panel: shows current form state for testing interactions */}
        <div style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', background: '#fff8', border: '1px solid #eee' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Debug — FarmPage state</h4>
          <div style={{ fontSize: '0.95rem', color: '#333' }}>
            <div><b>Soil Type:</b> {String(soilType || '—')}</div>
            <div><b>Crop Type:</b> {String(cropType || '—')}</div>
            <div><b>Irrigation:</b> {String(irrigation || '—')}</div>
            <div><b>Acres (state):</b> {String(acres !== '' ? acres : '—')}</div>
            <div><b>Is Analyzing:</b> {isAnalyzing ? 'yes' : 'no'}</div>
            <div><b>Predictions:</b> {allCropYields && allCropYields.length > 0 ? `${allCropYields.length} result(s)` : 'none'}</div>
          </div>
        </div>
        {gpsError && (
          <div style={{ color: 'red', margin: '1rem 0' }}>{gpsError}</div>
        )}
        {(lat && lon) && (
          <div style={{ margin: '1rem 0' }}>
            <b>Detected Location:</b> {lat && lon ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : 'Not set'}<br />
            <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <LeafletMapPicker
                lat={lat}
                lon={lon}
                onChange={(newLat, newLon) => {
                  setLat(newLat);
                  setLon(newLon);
                }}
              />
            </div>
            <button style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#43c6ac', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }} onClick={() => setShowManualMap(true)}>
              Adjust Location Manually
            </button>
          </div>
        )}
        {showManualMap && (
          <div style={{ margin: '1.5rem 0', background: '#f8ffae', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#8e44ad', marginBottom: '0.7rem' }}>Adjust Location Manually</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', alignItems: 'center' }}>
              <label>Latitude: <input type="number" step="0.000001" value={manualLat ?? ''} onChange={handleManualLatChange} style={{ width: '120px', marginLeft: '0.5rem' }} /></label>
              <label>Longitude: <input type="number" step="0.000001" value={manualLon ?? ''} onChange={handleManualLonChange} style={{ width: '120px', marginLeft: '0.5rem' }} /></label>
              <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <LeafletMapPicker
                  lat={manualLat ?? lat ?? 20.3}
                  lon={manualLon ?? lon ?? 85.8}
                  onChange={(newLat, newLon) => {
                    setManualLat(newLat);
                    setManualLon(newLon);
                  }}
                />
              </div>
              <button style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#8e44ad', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }} onClick={handleManualConfirm}>
                Confirm Location
              </button>
              <button style={{ marginTop: '0.5rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#ccc', color: '#333', border: 'none', fontWeight: 500, cursor: 'pointer' }} onClick={() => setShowManualMap(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Farm Data Section */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
          padding: '2.2rem 2rem',
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <h2 style={{ color: '#8e44ad', marginBottom: '1.2rem', fontSize: '2rem', letterSpacing: '1px' }}>Your Farm Data</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', alignItems: 'center', fontSize: '1.13rem' }}>
            <div><b>Soil Type:</b> <span style={{ color: soilType ? '#2b6f61' : '#aaa' }}>{soilType || 'Not entered'}</span></div>
            <div><b>Crop Type:</b> <span style={{ color: cropType ? '#2b6f61' : '#aaa' }}>{cropType || 'Not entered'}</span></div>
            <div><b>Acres of Land:</b> <span style={{ color: acres !== '' ? '#2b6f61' : '#aaa' }}>{acres !== '' ? acres : 'Not entered'}</span></div>
            <div><b>Irrigation Type:</b> <span style={{ color: irrigation ? '#2b6f61' : '#aaa' }}>{irrigation ? (irrigation.charAt(0).toUpperCase() + irrigation.slice(1)) : 'Not entered'}</span></div>
          </div>
        </div>
        {/* Crop Suggestions Section */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '20px',
          boxShadow: '0 4px 16px rgba(67,198,172,0.10)',
          padding: '1.7rem 1.5rem',
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <h2 style={{ color: '#43c6ac', marginBottom: '1rem', fontSize: '1.5rem' }}>Crop Suggestions</h2>
          {suggestions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem', listStyleType: 'disc', textAlign: 'left', fontSize: '1.13rem', color: '#333' }}>
              {suggestions.map((crop, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>{crop}</li>
              ))}
            </ul>
          ) : (
            <span style={{ color: '#aaa', fontSize: '1.13rem' }}>Enter soil type and click Analyse to get crop suggestions.</span>
          )}
        </div>
        {/* Predicted Yield Section for All Crops */}
        <div style={{
          background: 'rgba(255,255,255,0.96)',
          borderRadius: '20px',
          boxShadow: '0 4px 16px rgba(67,198,172,0.08)',
          padding: '1.7rem 1.5rem',
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <h2 style={{ color: '#8e44ad', marginBottom: '1rem', fontSize: '1.5rem' }}>Predicted Yield for All Crops</h2>
          <div style={{ fontSize: '1.13rem', color: '#333', textAlign: 'left', maxHeight: '300px', overflowY: 'auto' }}>
            {allCropYields.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8ffae' }}>
                    <th style={{ padding: '0.4rem', border: '1px solid #eee' }}>Crop</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #eee' }}>Yield/acre (tons)</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #eee' }}>Total Yield (tons)</th>
                  </tr>
                </thead>
                <tbody>
                  {allCropYields.map((r, idx) => (
                    <tr key={r.crop} style={{ background: idx % 2 === 0 ? '#fff' : '#f8ffae' }}>
                      <td style={{ padding: '0.4rem', border: '1px solid #eee' }}>{r.crop}</td>
                      <td style={{ padding: '0.4rem', border: '1px solid #eee', color: r.error ? '#d9534f' : '#2b6f61' }}>{r.error ? 'Error' : r.yieldPerAcre}</td>
                      <td style={{ padding: '0.4rem', border: '1px solid #eee', color: r.error ? '#d9534f' : '#2b6f61' }}>{r.error ? 'Error' : r.totalYield}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span style={{ color: '#d9534f' }}>Unable to predict. Please check server connection.</span>
            )}
          </div>
        </div>
        {/* Removed soilDebug block completely */}
      </div>
    </div>
  );
}
// Expose globally for use in FarmPage
window.detectSoilType = detectSoilType;

function ProcessPanel({ crop, language }) {
  const [tab, setTab] = React.useState('Fertilizer');
  const [showDetails, setShowDetails] = React.useState(false);
  const [plantingDate, setPlantingDate] = React.useState('');

  // Crop data for all tabs
  // Fertilizer content and usage
  const fertilizerContent = {
    Wheat: 'Nitrogen, Phosphorus, Potassium (NPK)',
    Rice: 'Urea, DAP, Potash',
    Sugarcane: 'NPK, Compost',
    Cotton: 'NPK, Sulfur',
    Pulses: 'DAP, Potash',
    Vegetables: 'Compost, NPK',
    Peanuts: 'Gypsum, SSP',
    Potatoes: 'NPK, Compost',
    Corn: 'Urea, DAP',
    Millets: 'NPK, Compost',
    Groundnut: 'Gypsum, SSP',
    Cashew: 'Compost, NPK',
    Sunflower: 'NPK, Compost',
    Jute: 'NPK, Compost',
    Barley: 'NPK, Compost',
    Spinach: 'Compost, NPK',
    Cabbage: 'Compost, NPK',
    Broccoli: 'Compost, NPK',
    Onions: 'Compost, NPK',
    Garlic: 'Compost, NPK',
    Peppers: 'Compost, NPK',
    Lettuce: 'Compost, NPK',
    Celery: 'Compost, NPK',
    Carrots: 'Compost, NPK',
    Beet: 'Compost, NPK',
    Tea: 'Compost, NPK',
    Coffee: 'Compost, NPK',
    Pineapple: 'Compost, NPK',
    Watermelon: 'Compost, NPK',
    Cantaloupe: 'Compost, NPK',
    Soybean: 'DAP, Potash'
  };
  const fertilizerUsage = {
    Wheat: 'Apply 50kg/acre of NPK fertilizer during sowing. Top-dress with 20kg/acre Urea at tillering.',
    Rice: 'Use 40kg/acre of Urea and 20kg/acre of DAP at transplanting. Add Potash if soil is deficient.',
    Sugarcane: 'Apply 80kg/acre of NPK at planting and 40kg/acre after 3 months.',
    Cotton: 'Apply 60kg/acre of NPK and 10kg/acre of Sulfur during planting. Split N application for best results.',
    Pulses: 'Use 20kg/acre of DAP and 10kg/acre of Potash before sowing.',
    Vegetables: 'Apply 30kg/acre of compost and 20kg/acre of NPK before planting.',
    Peanuts: 'Use 25kg/acre of Gypsum and 20kg/acre of SSP before sowing.',
    Potatoes: 'Apply 40kg/acre of NPK and 20kg/acre of compost before planting.',
    Corn: 'Use 50kg/acre of Urea and 30kg/acre of DAP at sowing.',
    Millets: 'Apply 20kg/acre of NPK and 10kg/acre of compost before sowing.',
    Groundnut: 'Use 25kg/acre of Gypsum and 20kg/acre of SSP before sowing.',
    Cashew: 'Apply 30kg/acre of compost and 10kg/acre of NPK at planting.',
    Sunflower: 'Use 40kg/acre of NPK and 20kg/acre of compost before sowing.',
    Jute: 'Apply 30kg/acre of NPK and 20kg/acre of compost before sowing.',
    Barley: 'Use 40kg/acre of NPK and 20kg/acre of compost before sowing.',
    Spinach: 'Apply 20kg/acre of compost and 10kg/acre of NPK before sowing.',
    Cabbage: 'Use 30kg/acre of compost and 20kg/acre of NPK before planting.',
    Broccoli: 'Apply 25kg/acre of compost and 15kg/acre of NPK before planting.',
    Onions: 'Use 20kg/acre of compost and 10kg/acre of NPK before sowing.',
    Garlic: 'Apply 15kg/acre of compost and 10kg/acre of NPK before sowing.',
    Peppers: 'Use 20kg/acre of compost and 10kg/acre of NPK before planting.',
    Lettuce: 'Apply 15kg/acre of compost and 10kg/acre of NPK before sowing.',
    Celery: 'Use 20kg/acre of compost and 10kg/acre of NPK before planting.',
    Carrots: 'Apply 15kg/acre of compost and 10kg/acre of NPK before sowing.',
    Beet: 'Use 20kg/acre of compost and 10kg/acre of NPK before sowing.',
    Tea: 'Apply 30kg/acre of compost and 10kg/acre of NPK at planting.',
    Coffee: 'Use 30kg/acre of compost and 10kg/acre of NPK at planting.',
    Pineapple: 'Apply 20kg/acre of compost and 10kg/acre of NPK before planting.',
    Watermelon: 'Use 20kg/acre of compost and 10kg/acre of NPK before planting.',
    Cantaloupe: 'Apply 20kg/acre of compost and 10kg/acre of NPK before planting.',
    Soybean: 'Use 20kg/acre of DAP and 10kg/acre of Potash before sowing.'
  };
  // Pest control content and usage
  const pesticideContent = {
    Wheat: 'Chlorpyrifos, Propiconazole',
    Rice: 'Carbofuran, Lambda-cyhalothrin',
    Sugarcane: 'Chlorpyrifos, Carbofuran',
    Cotton: 'Imidacloprid, Spinosad',
    Pulses: 'Malathion, Imidacloprid',
    Vegetables: 'Neem oil, Mancozeb',
    Peanuts: 'Chlorpyrifos, Mancozeb',
    Potatoes: 'Imidacloprid, Metalaxyl',
    Corn: 'Lambda-cyhalothrin, Spinosad',
    Millets: 'Malathion, Mancozeb',
    Groundnut: 'Chlorpyrifos, Mancozeb',
    Cashew: 'Imidacloprid, Copper oxychloride',
    Sunflower: 'Malathion, Mancozeb',
    Jute: 'Malathion, Mancozeb',
    Barley: 'Chlorpyrifos, Mancozeb',
    Spinach: 'Neem oil, Mancozeb',
    Cabbage: 'Malathion, Mancozeb',
    Broccoli: 'Malathion, Mancozeb',
    Onions: 'Malathion, Mancozeb',
    Garlic: 'Malathion, Mancozeb',
    Peppers: 'Neem oil, Mancozeb',
    Lettuce: 'Neem oil, Mancozeb',
    Celery: 'Neem oil, Mancozeb',
    Carrots: 'Malathion, Mancozeb',
    Beet: 'Malathion, Mancozeb',
    Tea: 'Imidacloprid, Copper oxychloride',
    Coffee: 'Imidacloprid, Copper oxychloride',
    Pineapple: 'Malathion, Mancozeb',
    Watermelon: 'Malathion, Mancozeb',
    Cantaloupe: 'Malathion, Mancozeb',
      Soybean: 'Malathion, Mancozeb',
    };
  
    const pesticideUsage = {
      Wheat: 'Use Chlorpyrifos for aphids and termites. Monitor for rust and treat with Propiconazole if needed.',
    Rice: 'Use Carbofuran for stem borers. Monitor for leaf folder and treat with Lambda-cyhalothrin.',
    Sugarcane: 'Use Chlorpyrifos for early shoot borer. Treat top borer with Carbofuran.',
    Cotton: 'Use Imidacloprid for whiteflies. Treat bollworms with Spinosad.',
    Pulses: 'Use Malathion for pod borer. Monitor for aphids and treat with Imidacloprid.',
    Vegetables: 'Use Neem oil for aphids and whiteflies. Treat fungal diseases with Mancozeb.',
    Peanuts: 'Use Chlorpyrifos for leaf miner. Treat fungal diseases with Mancozeb.',
    Potatoes: 'Use Imidacloprid for aphids. Treat blight with Metalaxyl.',
    Corn: 'Use Lambda-cyhalothrin for stem borer. Treat armyworm with Spinosad.',
    Millets: 'Use Malathion for shoot fly. Treat fungal diseases with Mancozeb.',
    Groundnut: 'Use Chlorpyrifos for leaf miner. Treat fungal diseases with Mancozeb.',
    Cashew: 'Use Imidacloprid for tea mosquito bug. Treat fungal diseases with Copper oxychloride.',
    Sunflower: 'Use Malathion for aphids. Treat fungal diseases with Mancozeb.',
    Jute: 'Use Malathion for stem weevil. Treat fungal diseases with Mancozeb.',
    Barley: 'Use Chlorpyrifos for aphids. Treat fungal diseases with Mancozeb.',
    Spinach: 'Use Neem oil for aphids. Treat fungal diseases with Mancozeb.',
    Cabbage: 'Use Malathion for cabbage worm. Treat fungal diseases with Mancozeb.',
    Broccoli: 'Use Malathion for aphids. Treat fungal diseases with Mancozeb.',
    Onions: 'Use Malathion for thrips. Treat fungal diseases with Mancozeb.',
    Garlic: 'Use Malathion for thrips. Treat fungal diseases with Mancozeb.',
    Peppers: 'Use Neem oil for aphids. Treat fungal diseases with Mancozeb.',
    Lettuce: 'Use Neem oil for aphids. Treat fungal diseases with Mancozeb.',
    Celery: 'Use Neem oil for aphids. Treat fungal diseases with Mancozeb.',
    Carrots: 'Use Malathion for carrot fly. Treat fungal diseases with Mancozeb.',
    Beet: 'Use Malathion for beet fly. Treat fungal diseases with Mancozeb.',
    Tea: 'Use Imidacloprid for tea mosquito bug. Treat fungal diseases with Copper oxychloride.',
    Coffee: 'Use Imidacloprid for coffee berry borer. Treat fungal diseases with Copper oxychloride.',
    Pineapple: 'Use Malathion for mealybug. Treat fungal diseases with Mancozeb.',
    Watermelon: 'Use Malathion for aphids. Treat fungal diseases with Mancozeb.',
    Cantaloupe: 'Use Malathion for aphids. Treat fungal diseases with Mancozeb.',
    Soybean: 'Use Malathion for soybean aphid. Treat fungal diseases with Mancozeb'
  };
  const cropImages = {
    Wheat: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80',
    Rice: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=200&q=80',
    Cotton: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=200&q=80',
    // ...add more crops as needed
  };
  const plantingProcessAdvice = {
    Wheat: 'Sow seeds in well-prepared soil at a depth of 4-5 cm. Maintain row spacing of 20 cm. Use certified seeds for best results.',
    Rice: 'Transplant seedlings 20-25 days after sowing. Maintain water level at 5 cm during early growth.',
    Sugarcane: 'Plant setts in furrows 10-15 cm deep. Maintain row spacing of 75 cm. Irrigate immediately after planting.',
    Cotton: 'Sow seeds at a depth of 2-3 cm in well-drained soil. Maintain row spacing of 60 cm. Irrigate after sowing.',
    Pulses: 'Sow seeds at a depth of 3-4 cm. Maintain row spacing of 30 cm. Use Rhizobium inoculation for better yield.',
    Vegetables: 'Prepare raised beds. Sow seeds at recommended depth and spacing. Irrigate lightly after sowing.',
    Peanuts: 'Sow seeds at a depth of 5 cm. Maintain row spacing of 30 cm. Irrigate after sowing.',
    Potatoes: 'Plant tubers at a depth of 8-10 cm. Maintain row spacing of 60 cm. Irrigate after planting.',
    Corn: 'Sow seeds at a depth of 4-5 cm. Maintain row spacing of 60 cm. Irrigate after sowing.',
    Millets: 'Sow seeds at a depth of 2-3 cm. Maintain row spacing of 25 cm. Irrigate after sowing.',
    Groundnut: 'Sow seeds at a depth of 5 cm. Maintain row spacing of 30 cm. Irrigate after sowing.',
    Cashew: 'Plant grafted saplings in pits 60x60x60 cm. Maintain spacing of 8 m. Irrigate after planting.',
    Sunflower: 'Sow seeds at a depth of 3-4 cm. Maintain row spacing of 45 cm. Irrigate after sowing.',
    Jute: 'Sow seeds at a depth of 2-3 cm. Maintain row spacing of 25 cm. Irrigate after sowing.',
    Barley: 'Sow seeds at a depth of 4-5 cm. Maintain row spacing of 20 cm. Irrigate after sowing.',
    Spinach: 'Sow seeds at a depth of 1-2 cm. Maintain row spacing of 20 cm. Irrigate after sowing.',
    Cabbage: 'Transplant seedlings 30 days after sowing. Maintain spacing of 45 cm. Irrigate after transplanting.',
    Broccoli: 'Transplant seedlings 30 days after sowing. Maintain spacing of 45 cm. Irrigate after transplanting.',
    Onions: 'Transplant seedlings 40 days after sowing. Maintain spacing of 10 cm. Irrigate after transplanting.',
    Garlic: 'Plant cloves at a depth of 2-3 cm. Maintain spacing of 10 cm. Irrigate after planting.',
    Peppers: 'Transplant seedlings 30 days after sowing. Maintain spacing of 30 cm. Irrigate after transplanting.',
    Lettuce: 'Sow seeds at a depth of 1 cm. Maintain row spacing of 20 cm. Irrigate after sowing.',
    Celery: 'Transplant seedlings 40 days after sowing. Maintain spacing of 20 cm. Irrigate after transplanting.',
    Carrots: 'Sow seeds at a depth of 1-2 cm. Maintain row spacing of 20 cm. Irrigate after sowing.',
    Beet: 'Sow seeds at a depth of 2-3 cm. Maintain row spacing of 20 cm. Irrigate after sowing.',
    Tea: 'Plant seedlings in well-drained soil. Maintain spacing of 1.2 m. Irrigate after planting.',
    Coffee: 'Plant seedlings in well-drained soil. Maintain spacing of 2 m. Irrigate after planting.',
    Pineapple: 'Plant suckers in well-drained soil. Maintain spacing of 30 cm. Irrigate after planting.',
    Watermelon: 'Sow seeds at a depth of 2-3 cm. Maintain spacing of 1 m. Irrigate after sowing.',
    Cantaloupe: 'Sow seeds at a depth of 2-3 cm. Maintain spacing of 1 m. Irrigate after sowing.',
    Soybean: 'Sow seeds at a depth of 4-5 cm. Maintain row spacing of 30 cm. Irrigate after sowing.',
    Other: 'Consult local agricultural extension for planting process.'
  };
  const irrigationAdvice = {
    Wheat: 'Irrigate at critical growth stages: crown root initiation, tillering, jointing, booting, heading, and grain filling.',
    Rice: 'Maintain standing water during early growth, then alternate wetting and drying.',
    Sugarcane: 'Irrigate at planting and every 10-12 days during growth.',
    Cotton: 'Irrigate at flowering and boll formation stages. Avoid waterlogging.',
    Pulses: 'Irrigate at sowing and pod formation stages.',
    Vegetables: 'Irrigate regularly to maintain moist soil.',
    Peanuts: 'Irrigate at sowing and pod formation stages.',
    Potatoes: 'Irrigate at planting and tuber formation stages.',
    Corn: 'Irrigate at sowing and tasseling stages.',
    Millets: 'Irrigate at sowing and flowering stages.',
    Groundnut: 'Irrigate at sowing and pod formation stages.',
    Cashew: 'Irrigate after planting and during dry spells.',
    Sunflower: 'Irrigate at sowing and flowering stages.',
    Jute: 'Irrigate at sowing and early growth stages.',
    Barley: 'Irrigate at sowing and heading stages.',
    Spinach: 'Irrigate regularly to maintain moist soil.',
    Cabbage: 'Irrigate after transplanting and at head formation.',
    Broccoli: 'Irrigate after transplanting and at head formation.',
    Onions: 'Irrigate after transplanting and bulb formation.',
    Garlic: 'Irrigate after planting and bulb formation.',
    Peppers: 'Irrigate after transplanting and fruit formation.',
    Lettuce: 'Irrigate regularly to maintain moist soil.',
    Celery: 'Irrigate after transplanting and during growth.',
    Carrots: 'Irrigate regularly to maintain moist soil.',
    Beet: 'Irrigate regularly to maintain moist soil.',
    Tea: 'Irrigate after planting and during dry spells.',
    Coffee: 'Irrigate after planting and during dry spells.',
    Pineapple: 'Irrigate after planting and during dry spells.',
    Watermelon: 'Irrigate at sowing and fruit formation.',
    Cantaloupe: 'Irrigate at sowing and fruit formation.',
    Soybean: 'Irrigate at sowing and pod formation.',
    Other: 'Consult local agricultural extension for irrigation advice.'
  };
  const harvestAdvice = {
    Wheat: 'Harvest about 120 days after planting, when grains are golden and moisture is around 14%.',
    Rice: 'Harvest about 110-130 days after transplanting, when grains are mature and hard.',
    Sugarcane: 'Harvest about 10-12 months after planting, when stalks are mature.',
    Cotton: 'Harvest about 150-180 days after planting, when bolls are fully open.',
    Pulses: 'Harvest about 90-100 days after sowing, when pods are mature.',
    Vegetables: 'Harvest as per crop maturity and market demand.',
    Peanuts: 'Harvest about 120-150 days after sowing, when pods are mature.',
    Potatoes: 'Harvest about 90-120 days after planting, when tubers are mature.',
    Corn: 'Harvest about 100-120 days after sowing, when cobs are mature.',
    Millets: 'Harvest about 80-100 days after sowing, when grains are mature.',
    Groundnut: 'Harvest about 120-150 days after sowing, when pods are mature.',
    Cashew: 'Harvest nuts when fully mature and apple is yellow.',
    Sunflower: 'Harvest about 90-100 days after sowing, when heads are dry.',
    Jute: 'Harvest about 120 days after sowing, when plants are 2-3 m tall.',
    Barley: 'Harvest about 120 days after sowing, when grains are golden.',
    Spinach: 'Harvest about 30-40 days after sowing, when leaves are mature.',
    Cabbage: 'Harvest about 70-80 days after transplanting, when heads are firm.',
    Broccoli: 'Harvest about 60-70 days after transplanting, when heads are firm.',
    Onions: 'Harvest about 100-120 days after transplanting, when bulbs are mature.',
    Garlic: 'Harvest about 120-150 days after planting, when bulbs are mature.',
    Peppers: 'Harvest about 60-80 days after transplanting, when fruits are mature.',
    Lettuce: 'Harvest about 40-60 days after sowing, when leaves are mature.',
    Celery: 'Harvest about 100-120 days after transplanting, when stalks are mature.',
    Carrots: 'Harvest about 70-80 days after sowing, when roots are mature.',
    Beet: 'Harvest about 60-80 days after sowing, when roots are mature.',
    Tea: 'Harvest leaves as per flush cycle.',
    Coffee: 'Harvest berries when fully ripe.',
    Pineapple: 'Harvest about 18-24 months after planting, when fruit is mature.',
    Watermelon: 'Harvest about 80-100 days after sowing, when fruit is mature.',
    Cantaloupe: 'Harvest about 80-100 days after sowing, when fruit is mature.',
    Soybean: 'Harvest about 90-120 days after sowing, when pods are mature.',
    Other: 'Consult local agricultural extension for harvest advice.'
  };

  // Calculate harvest date
  function getHarvestDate() {
    if (!plantingDate || !crop || !harvestAdvice[crop]) return '';
    // Example: add 120 days for Wheat, etc.
    const days = crop === 'Wheat' ? 120 : crop === 'Rice' ? 120 : crop === 'Cotton' ? 150 : 120;
    const date = new Date(plantingDate);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString();
  }

  return (
    <div style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9)), url(${patternImg})`, borderRadius: '24px', padding: '2rem', maxWidth: '760px', margin: '2rem auto', backgroundSize: 'cover' }}>
      <h2 style={{ color: '#8e44ad' }}>Process</h2>
      <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
        <button onClick={() => setShowDetails(s => !s)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc' }}>{showDetails ? 'Hide Crop Details' : 'View Crop Details'}</button>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => setTab('Fertilizer')} disabled={tab==='PlantingProcess'} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab==='Fertilizer' ? '2px solid #8e44ad' : '1px solid #ccc', background: tab==='Fertilizer' ? 'rgba(142,68,173,0.08)' : '#fff', opacity: tab==='PlantingProcess' ? 0.5 : 1 }}>Fertilizer</button>
        <button onClick={() => setTab('PestControl')} disabled={tab==='PlantingProcess'} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab==='PestControl' ? '2px solid #8e44ad' : '1px solid #ccc', background: tab==='PestControl' ? 'rgba(142,68,173,0.08)' : '#fff', opacity: tab==='PlantingProcess' ? 0.5 : 1 }}>Pest Control</button>
        <button onClick={() => setTab('PlantingProcess')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab==='PlantingProcess' ? '2px solid #8e44ad' : '1px solid #ccc', background: tab==='PlantingProcess' ? 'rgba(142,68,173,0.08)' : '#fff' }}>Planting Process</button>
      </div>
      {tab==='PlantingProcess' ? (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Planting Process</h3>
          <p>{plantingProcessAdvice[crop] || 'No planting process data available.'}</p>
          <label>Planting Date:</label><br />
          <input type="date" value={plantingDate} onChange={e => setPlantingDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem' }} />
          {plantingDate && crop && (
            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h4>Harvest Recommendation</h4>
              <p>{harvestAdvice[crop] || 'No harvest data.'}</p>
              <p>Estimated Harvest Date: <b>{getHarvestDate()}</b></p>
              <h4>Irrigation Advice</h4>
              <p>{irrigationAdvice[crop] || 'No irrigation data.'}</p>
              <h4>Crop Image</h4>
              {cropImages[crop] && <img src={cropImages[crop]} alt={crop} style={{ width: '120px', borderRadius: '12px' }} />}
            </div>
          )}
        </div>
      ) : tab==='Fertilizer' ? (
        <div>
          <h3>Fertilizer Suggestion</h3>
          <b>Content:</b>
          <p>{fertilizerContent[crop] || 'No data available'}</p>
          <b>How to Use:</b>
          <p>{fertilizerUsage[crop] || 'No data available'}</p>
        </div>
      ) : tab==='PestControl' ? (
        <div>
          <h3>Pest Control Suggestion</h3>
          <b>Content:</b>
          <p>{pesticideContent[crop] || 'No data available'}</p>
          <b>How to Use:</b>
          <p>{pesticideUsage[crop] || 'No data available'}</p>
        </div>
      ) : null}
  {showDetails && <CropProcessingPage crop={crop} language={language} />}
    </div>
  );
}
  
// eslint-disable-next-line no-unused-vars
function DashboardPage({ language, username, userLocation, setUserLocation }) {


  // Pass setUserLocation to FarmPage so it can update location
  // Add missing state variables
  const [showFarm, setShowFarm] = React.useState(false);
  const [showProcess, setShowProcess] = React.useState(false);
  const [selectedCrop, setSelectedCrop] = React.useState('');
  // Removed unused showWeather and setShowWeather
  const text = {
      en: {
        dashboard: 'AgriPredict Dashboard',

        cropImages: 'Crop Images'
      },
      odi: {
        dashboard: 'ଆଗ୍ରିପ୍ରଡିକ୍ଟ ଡ୍ୟାଶବୋର୍ଡ',

        cropImages: 'ଚାଷୀ ଚିତ୍ର'
      }
    };
  
    const content = text[language] || text.en;
    return (
      <div style={{
        minHeight: '100vh',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: 'linear-gradient(120deg, #f6d365 0%, #feb47b 100%)',
        display: 'flex',
      }}>
        {/* Side Menu Bar */}
        <div style={{
          width: '220px',
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '2px 0 12px rgba(60,60,120,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '2.5rem',
          borderTopRightRadius: '32px',
          borderBottomRightRadius: '32px',
          minHeight: '100vh',
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#ff7e5f',
            marginBottom: '2.5rem',
            letterSpacing: '1px',
          }}>AgriPredict</div>
          <nav style={{ width: '100%' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '1.5rem' }}>
                <button style={{
                  width: '90%',
                  padding: '0.7rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #ff7e5f 0%, #feb47b 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(255,126,95,0.12)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }} onClick={() => { setShowFarm(false); setShowProcess(false); }}>
                  Dashboard
                </button>
              </li>
              <li style={{ marginBottom: '1.5rem' }}>
                <button style={{
                  width: '90%',
                  padding: '0.7rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #43c6ac 0%, #f8ffae 100%)',
                  color: '#333',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(67,198,172,0.12)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }} onClick={() => { setShowFarm(true); setShowProcess(false); }}>
                  Farm
                </button>
              </li>
              <li style={{ marginBottom: '1.5rem' }}>
                <button style={{
                  width: '90%',
                  padding: '0.7rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #8e44ad 0%, #9b59b6 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(142,68,173,0.12)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }} onClick={() => { setShowFarm(false); setShowProcess(true); }}>
                  Process
                </button>
              </li>
            </ul>
          </nav>
        </div>
        {/* Dashboard content rendered outside the side menu */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          {showFarm ? (
            <div style={{ width: '100%', maxWidth: '800px' }}>
              <FarmPage 
                onBack={() => setShowFarm(false)} 
                language={language} 
                setSelectedCrop={setSelectedCrop} 
                setUserLocation={setUserLocation} 
              />
            </div>
          ) : showProcess ? (
            <ProcessPanel crop={selectedCrop} language={language} />
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(60,60,120,0.18)',
              padding: '2.5rem 2rem',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              margin: '2rem auto',
              alignSelf: 'center',
            }}>
              <h2 style={{ color: '#8e44ad', marginBottom: '1.2rem' }}>{content.dashboard}</h2>
              {userLocation && (
                <div style={{ marginBottom: '1rem', color: '#43c6ac' }}>
                  <b>Location:</b> {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    );
  }
  
  // eslint-disable-next-line no-unused-vars
  function WelcomePage({ onStart, language }) {
    const text = {
      en: {
        title: 'Welcome to AgriPredict',
        description: 'Your smart dashboard for crop insights. Click below to get started!',
        button: 'Enter Dashboard'
      },
      odi: {
        title: 'ଆଗ୍ରିପ୍ରଡିକ୍ଟକୁ ସ୍ୱାଗତ',
        description: 'ଆପଣଙ୍କର ଆବହାଓା, ଜଳବାୟୁ ଏବଂ ଚାଷୀ ଜ୍ଞାନ ପାଇଁ ସ୍ମାର୍ଟ ଡ୍ୟାଶବୋର୍ଡ। ଆରମ୍ଭ କରିବାକୁ ନିମ୍ନରେ କ୍ଲିକ୍ କରନ୍ତୁ!',
        button: 'ଡ୍ୟାଶବୋର୍ଡକୁ ପ୍ରବେଶ କରନ୍ତୁ'
      }
    };
  
    const content = text[language] || text.en;
  
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial',
        background: 'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)',
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{content.title}</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{content.description}</p>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.2rem',
              borderRadius: '8px',
              background: 'linear-gradient(90deg,#43c6ac,#f8ffae)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={onStart}
          >
            {content.button}
          </button>
        </div>
      </div>
    );
  }
  
  // eslint-disable-next-line no-unused-vars
  function LoginPage({ onLogin, language }) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
  
    const text = {
      en: {
        title: 'Login',
        username: 'Username',
        password: 'Password',
        button: 'Login'
      },
      odi: {
        title: 'ଲଗଇନ୍',
        username: 'ଉପଯୋଗକର୍ତ୍ତା ନାମ',
        password: 'ପାସୱାର୍ଡ',
        button: 'ଲଗଇନ୍'
      }
    };
  
    const content = text[language] || text.en;
  
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial',
        background: 'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)',
      }}>
        <h2 style={{ marginBottom: '1rem' }}>{content.title}</h2>
        <input
          type="text"
          placeholder={content.username}
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ marginBottom: '1rem', padding: '0.5rem', fontSize: '1rem', width: '200px' }}
        />
        <input
          type="password"
          placeholder={content.password}
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: '1rem', padding: '0.5rem', fontSize: '1rem', width: '200px' }}
        />
        <button style={{ padding: '0.75rem 2rem', fontSize: '1.2rem', borderRadius: '8px', background: '#43c6ac', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={() => onLogin(username)}>
          {content.button}
        </button>
      </div>
    );
  }
  
  // eslint-disable-next-line no-unused-vars
  function UserProfile({ username, onContinue, language }) {
    const text = {
      en: {
        title: 'User Profile',
        welcome: 'Welcome,',
        button: 'Continue to Dashboard'
      },
      odi: {
        title: 'ଉପଯୋଗକର୍ତ୍ତା ପ୍ରୋଫାଇଲ୍',
        welcome: 'ସ୍ୱାଗତ,',
        button: 'ଡ୍ୟାଶବୋର୍ଡକୁ ଚାଲନ୍ତୁ'
      }
    };
  
    const content = text[language] || text.en;
  
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial',
        background: 'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)',
      }}>
        <h2 style={{ marginBottom: '1rem' }}>{content.title}</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{content.welcome} <b>{username}</b>!</p>
        <button style={{ padding: '0.75rem 2rem', fontSize: '1.2rem', borderRadius: '8px', background: '#43c6ac', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={onContinue}>
          {content.button}
        </button>
      </div>
    );
  }
  
  function CropProcessingPage({ crop }) {
    const fertilizerInfo = {
      Wheat: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 50kg/acre of NPK fertilizer during sowing.',
      },
      Rice: {
        content: 'Urea, DAP, Potash',
        usage: 'Use 40kg/acre of Urea and 20kg/acre of DAP at transplanting.',
      },
      Cotton: {
        content: 'Nitrogen, Phosphorus, Potassium, Sulfur',
        usage: 'Apply 60kg/acre of NPK and 10kg/acre of Sulfur during planting.',
      },
      // Add more crops as needed
    };
  
    const cropInfo = fertilizerInfo[crop] || {
      content: 'No specific fertilizer information available.',
      usage: 'Please consult an agricultural expert.',
    };
  
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial',
        background: 'linear-gradient(135deg, #f8ffae 0%, #43c6ac 100%)',
        padding: '2rem',
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Crop Processing Details</h1>
        <h2 style={{ fontSize: '2rem', color: '#43c6ac' }}>{crop}</h2>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(60,60,120,0.1)',
          padding: '2rem',
          maxWidth: '600px',
          textAlign: 'left',
        }}>
          <h3>Fertilizer Content:</h3>
          <p>{cropInfo.usage}</p>
        </div>
      </div>
    );
  }

function App() {
  const [loggedIn, setLoggedIn] = React.useState(() => {
    return localStorage.getItem('loggedIn') === 'true';
  });
  const [language, setLanguage] = React.useState('en');
  const [userLocation, setUserLocation] = React.useState(null);
  // ...existing code...

  const handleAuth = () => {
    setLoggedIn(true);
    localStorage.setItem('loggedIn', 'true');
  };

  const handleLogout = async () => {
  await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    setLoggedIn(false);
    localStorage.removeItem('loggedIn');
  };

  if (!loggedIn) {
    return <LoginPage onLogin={handleAuth} language={language} />;
  }
  return (
    <div>
      <button className="btn btn-accent" style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }} onClick={handleLogout}>Logout</button>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '1rem' }}>
          <option value="en">English</option>
          <option value="odi">Odia</option>
          <option value="ta">Tamil</option>
        </select>
      </div>
      {/* Main dashboard page after login */}
      <DashboardPage language={language} userLocation={userLocation} setUserLocation={setUserLocation} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
/* Run python ml_yield_predictor.py to start the backend */