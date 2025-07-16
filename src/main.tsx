import { useState, useEffect, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext.tsx';
import App from './App.tsx';
import Home from './pages/Home.tsx';
import SearchResults from './pages/SearchResults.tsx';
import DeepResearchResults from './pages/DeepResearchResults.tsx';
import ProSearchResults from './pages/ProSearchResults.tsx';
import Settings from './pages/Settings.tsx';
import Policies from './pages/Policies.tsx';
import AuthCallback from './components/auth/AuthCallback.tsx';
import SubscriptionSuccess from './pages/SubscriptionSuccess.tsx';
import { logger } from './utils/logger.ts';
import InsightsResults from './pages/InsightsResults.tsx';
import ResearcherResults from './pages/ResearcherResults.tsx';
import LabsResults from './pages/LabsResults.tsx';
import './index.css';

// Configure router with future flags
const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/search', element: <SearchResults /> },
        { path: '/pro-search', element: <ProSearchResults /> },
        { path: '/deep-research', element: <DeepResearchResults /> },
        { path: '/insights-results', element: <InsightsResults /> },
        { path: '/research-results', element: <ResearcherResults /> },
        { path: '/researcher-results', element: <ResearcherResults /> },
        { path: '/labs-results', element: <LabsResults /> },
        { path: '/pro-labs-results', element: <LabsResults /> },
        { path: '/settings', element: <Settings /> },
        { path: '/policies', element: <Policies /> },
        { path: '/auth/callback', element: <AuthCallback /> },
        { path: '/subscription/success', element: <SubscriptionSuccess /> }
      ]
    }
  ]
);

// Configure error handling for unhandled promises
globalThis.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  });
  event.preventDefault();
});

// Configure error handling for uncaught errors
globalThis.addEventListener('error', (event) => {
  logger.error('Uncaught Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: new Date().toISOString()
  });
  event.preventDefault();
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

// Error boundary functional component
function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      logger.error('Uncaught Error caught by ErrorBoundary:', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
        timestamp: new Date().toISOString()
      });
      setHasError(true);
    };

    globalThis.addEventListener('error', errorHandler);
    return () => globalThis.removeEventListener('error', errorHandler);
  }, []);

  // Note: For more comprehensive error catching in functional components (including within event handlers),
  // you might need a dedicated library like react-error-boundary or implement a componentDidCatch equivalent
  // using a class component as a wrapper if needed for specific cases not covered by global error handling.

  if (hasError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-4">We're sorry, but something went wrong. Please try refreshing the page.</p>
          <button
            onClick={() => globalThis.location.reload()}
            className="bg-[#007BFF] text-white px-4 py-2 rounded-lg hover:bg-[#0056b3] transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
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

// Wrap app with error boundary and auth provider
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ErrorBoundary>
);