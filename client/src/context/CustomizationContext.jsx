import React, { createContext, useContext, useState, useEffect } from 'react';

const CustomizationContext = createContext();

export const useCustomization = () => useContext(CustomizationContext);

export const CustomizationProvider = ({ children }) => {
  const [backgroundImage, setBackgroundImage] = useState(() => {
    return localStorage.getItem('vortex_bg_image') || '';
  });
  
  const [logo, setLogo] = useState(() => {
    return localStorage.getItem('vortex_logo') || '';
  });

  useEffect(() => {
    if (backgroundImage) {
      localStorage.setItem('vortex_bg_image', backgroundImage);
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      localStorage.removeItem('vortex_bg_image');
      document.body.style.backgroundImage = '';
    }
  }, [backgroundImage]);

  useEffect(() => {
    if (logo) {
      localStorage.setItem('vortex_logo', logo);
    } else {
      localStorage.removeItem('vortex_logo');
    }
  }, [logo]);

  const updateBackgroundImage = (url) => setBackgroundImage(url);
  const updateLogo = (url) => setLogo(url);

  return (
    <CustomizationContext.Provider
      value={{
        backgroundImage,
        updateBackgroundImage,
        logo,
        updateLogo,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
};
