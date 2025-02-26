import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth/AuthContext';
import App from './App';
import { env } from './config/env';
import { logger } from './utils/logger';
import './index.css';

// Configure error handling for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  });
  event.preventDefault();
});

// Configure error handling for uncaught errors
window.addEventListener('error', (event) => {
  logger.error('Uncaught Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: new Date().toISOString()
  });
  event.preventDefault();
});

// Error boundary for the entire app
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logger.error('React Error Boundary caught error:', {
      error: error.message,
      stack: error.stack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-medium text-white mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-4">We're sorry, but something went wrong. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#007BFF] text-white px-4 py-2 rounded-lg hover:bg-[#0056b3] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Get the root element
const rootElement = document.getElementById('root');

// Validate root element exists
if (!rootElement) {
  logger.error('Root element not found');
  document.body.innerHTML = '<div class="min-h-screen bg-black flex items-center justify-center"><div class="text-center text-white">Failed to initialize application</div></div>';
  throw new Error('Root element not found');
}

// Create root and render app
const root = createRoot(rootElement);

// Initialize environment
logger.info('Initializing app with environment:', env);

// Wrap app with error boundary and auth provider
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);