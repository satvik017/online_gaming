import React, { useState } from 'react';
import { Settings, Image as ImageIcon, X, LayoutDashboard } from 'lucide-react';
import { useCustomization } from '../context/CustomizationContext';

const CustomizationSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { backgroundImage, updateBackgroundImage, logo, updateLogo } = useCustomization();
  
  const [bgInput, setBgInput] = useState(backgroundImage);
  const [logoInput, setLogoInput] = useState(logo);

  const handleSave = () => {
    updateBackgroundImage(bgInput);
    updateLogo(logoInput);
    setIsOpen(false);
  };

  const handleReset = () => {
    updateBackgroundImage('');
    updateLogo('');
    setBgInput('');
    setLogoInput('');
  };

  return (
    <>
      {/* Toggle Button for the Sidebar */}
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary"
        style={{
          position: 'fixed',
          left: '1rem',
          bottom: '1rem',
          zIndex: 40,
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
        title="Customize Theme"
      >
        <Settings size={24} />
      </button>

      {/* Sidebar Overlay and Panel */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          {/* Backdrop */}
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <div style={{
            position: 'relative',
            width: '320px',
            height: '100%',
            background: 'var(--panel-bg)',
            borderRight: '1px solid var(--border-color)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            animation: 'slideInLeft 0.3s ease-out forwards'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutDashboard size={20} className="text-cyan" /> Theme Settings
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Background Image Input */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <ImageIcon size={16} /> Background Image URL
                </label>
                <input 
                  type="text" 
                  value={bgInput} 
                  onChange={(e) => setBgInput(e.target.value)}
                  className="input-field" 
                  placeholder="https://example.com/bg.jpg"
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Provide a direct URL to an image to replace the default background.
                </p>
              </div>

              {/* Logo Image Input */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <ImageIcon size={16} /> Custom Logo URL
                </label>
                <input 
                  type="text" 
                  value={logoInput} 
                  onChange={(e) => setLogoInput(e.target.value)}
                  className="input-field" 
                  placeholder="https://example.com/logo.png"
                  style={{ width: '100%' }}
                />
              </div>

            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
              <button onClick={handleSave} className="btn btn-cyan" style={{ width: '100%' }}>
                Apply Changes
              </button>
              <button onClick={handleReset} className="btn btn-secondary" style={{ width: '100%' }}>
                Reset to Defaults
              </button>
            </div>
            
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .text-cyan { color: var(--accent-cyan); }
      `}</style>
    </>
  );
};

export default CustomizationSidebar;
