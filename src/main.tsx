import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth/AuthContext';
import App from './App';
import './index.css';

// Get the root element
const rootElement = document.getElementById('root');

// Validate root element exists
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Create root and render app
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);