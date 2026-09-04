import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CustomizationProvider } from './context/CustomizationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CustomizationProvider>
      <App />
    </CustomizationProvider>
  </StrictMode>,
)
