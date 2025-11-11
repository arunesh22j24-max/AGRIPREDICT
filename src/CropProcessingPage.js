import React from 'react';

function CropProcessingPage({ crop, language = 'en' }) {
  const fertilizerInfo = {
    Wheat: {
      en: {
        content: 'Nitrogen (N), Phosphorus (P), Potassium (K)',
        usage: 'Apply 50kg/acre of NPK (18:18:18) fertilizer at sowing and top-dress with 20kg/acre Urea at tillering.',
      },
      // Add other languages here
    },
    Rice: {
      en: {
        content: 'Urea, DAP (Diammonium Phosphate), Potash',
        usage: 'Use 40kg/acre of Urea and 20kg/acre of DAP at transplanting. Add 15kg/acre Potash at panicle initiation.',
      },
    },
    Sugarcane: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 60kg/acre of NPK at planting and 40kg/acre Urea at early growth.',
      },
    },
    Cotton: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium, Sulfur',
        usage: 'Apply 60kg/acre of NPK and 10kg/acre of Sulfur during planting. Top-dress with 20kg/acre Urea at flowering.',
      },
    },
    Pulses: {
      en: {
        content: 'Phosphorus, Potassium, Rhizobium inoculant',
        usage: 'Apply 20kg/acre of SSP (Single Super Phosphate) and 10kg/acre Potash. Use Rhizobium inoculant for seed treatment.',
      },
    },
    Vegetables: {
      en: {
        content: 'NPK, Organic compost',
        usage: 'Apply 30kg/acre of NPK and 2 tons/acre of compost before planting. Top-dress with 10kg/acre Urea as needed.',
      },
    },
    Peanuts: {
      en: {
        content: 'Gypsum (Calcium Sulfate), Phosphorus, Potassium',
        usage: 'Apply 20kg/acre of SSP and 200kg/acre Gypsum at flowering. Add 10kg/acre Potash at pod formation.',
      },
    },
    Potatoes: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 40kg/acre of NPK at planting and 20kg/acre Urea at tuber initiation.',
      },
    },
    Corn: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 50kg/acre of NPK at sowing and 20kg/acre Urea at 6-leaf stage.',
      },
    },
    Millets: {
      en: {
        content: 'Nitrogen, Phosphorus',
        usage: 'Apply 20kg/acre of NPK at sowing and 10kg/acre Urea at tillering.',
      },
    },
    Groundnut: {
      en: {
        content: 'Gypsum, Phosphorus, Potassium',
        usage: 'Apply 200kg/acre Gypsum at flowering and 10kg/acre Potash at pod formation.',
      },
    },
    Cashew: {
      en: {
        content: 'Organic manure, NPK',
        usage: 'Apply 10kg/plant of compost and 1kg/plant NPK annually.',
      },
    },
    Sunflower: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 30kg/acre of NPK at sowing and 10kg/acre Urea at bud formation.',
      },
    },
    Jute: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 40kg/acre of NPK at sowing and 10kg/acre Urea at 30 days after sowing.',
      },
    },
    Barley: {
      en: {
        content: 'Nitrogen, Phosphorus, Potassium',
        usage: 'Apply 30kg/acre of NPK at sowing and 10kg/acre Urea at tillering.',
      },
    },
    Other: {
      en: {
        content: 'Consult local agricultural guidelines.',
        usage: 'Fertilizer recommendations vary. Please consult an expert.',
      },
    },
  };

  const cropInfo = (fertilizerInfo[crop] && fertilizerInfo[crop][language]) || fertilizerInfo[crop]?.en || {
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
      fontFamily: 'Segoe UI, Arial, sans-serif',
      background: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
      padding: '2.5rem 1rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        borderRadius: '28px',
        boxShadow: '0 8px 32px rgba(60,60,120,0.18)',
        padding: '2.8rem 2.2rem',
        maxWidth: '540px',
        width: '100%',
        textAlign: 'center',
        marginBottom: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: '#8e44ad', letterSpacing: '1px', textAlign: 'center' }}>Crop Processing Details</h1>
        <h2 style={{ fontSize: '1.4rem', color: '#43c6ac', marginBottom: '1.1rem', textAlign: 'center' }}>{crop}</h2>
        <div style={{
          background: 'linear-gradient(90deg, #f8ffae 0%, #43c6ac 100%)',
          borderRadius: '18px',
          boxShadow: '0 2px 8px rgba(67,198,172,0.10)',
          padding: '1.7rem 1.2rem',
          marginBottom: '1.3rem',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <h3 style={{ color: '#2b6f61', marginBottom: '0.4rem', textAlign: 'left' }}>Fertilizer Content</h3>
          <p style={{ fontSize: '1.13rem', color: '#333', marginBottom: '1.1rem', textAlign: 'left', lineHeight: 1.7 }}>{cropInfo.content}</p>
          <h3 style={{ color: '#2b6f61', marginBottom: '0.4rem', textAlign: 'left' }}>How to Use</h3>
          <p style={{ fontSize: '1.13rem', color: '#333', textAlign: 'left', lineHeight: 1.7 }}>{cropInfo.usage}</p>
        </div>
        <button style={{
          marginTop: '1.3rem',
          padding: '0.8rem 2.2rem',
          fontSize: '1.13rem',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, #8e44ad 0%, #9b59b6 100%)',
          color: '#fff',
          border: 'none',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(60,60,120,0.10)',
        }}>Back to Dashboard</button>
      </div>
    </div>
  );
}

export default CropProcessingPage;