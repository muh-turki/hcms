import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#21262d',
            color: '#e6edf3',
            border: '1px solid #30363d',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#3fb950', secondary: '#21262d' } },
          error:   { iconTheme: { primary: '#f85149', secondary: '#21262d' } },
        }}
      />
    </AppProvider>
  </BrowserRouter>
);
