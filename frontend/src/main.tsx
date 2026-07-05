import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Dynamic API URL Injection for Deployment
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith((import.meta.env.VITE_API_URL || 'http://localhost:5000/api'))) {
    let apiBase = import.meta.env.VITE_API_URL;
    if (apiBase) {
      if (apiBase.endsWith('/')) {
        apiBase = apiBase.slice(0, -1);
      }
      if (!apiBase.endsWith('/api')) {
        apiBase = `${apiBase}/api`;
      }
      input = input.replace((import.meta.env.VITE_API_URL || 'http://localhost:5000/api'), apiBase);
    }
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
