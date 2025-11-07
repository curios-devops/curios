import { useState, useEffect, ReactNode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext.tsx';
import App from './App.tsx';
import Home from './mainPages/Home.tsx'; // Keep Home page eager loaded as it's the landing page
import { logger } from './utils/logger.ts';
import './index.css';

// Lazy load page components from their respective service directories
const SearchResults = lazy(() => import('./services/search/regular/pages/SearchResults.tsx'));
const DeepResearchResults = lazy(() => import('./services/research/pro/pages/ResearchResults.tsx'));
const ProSearchResults = lazy(() => import('./services/search/pro/pages/ProSearchResults.tsx'));
const ProSearchTest = lazy(() => import('./services/search/pro/pages/ProSearchTest.tsx'));
const InsightsResults = lazy(() => import('./services/research/regular/pages/InsightsResults.tsx'));
const TavilySearchTest = lazy(() => import('./services/research/regular/pages/TavilySearchTest.tsx'));
const ResearcherResults = lazy(() => import('./services/research/pro/pages/ResearcherResults.tsx'));
const LabsResults = lazy(() => import('./services/lab/regular/pages/LabsResults.tsx'));
const Settings = lazy(() => import('./mainPages/Settings.tsx'));
const TestPage = lazy(() => import('./pages/test.tsx'));
const ImageTest = lazy(() => import('./pages/ImageTest.tsx'));
const SerpApiTest = lazy(() => import('./pages/SerpApiTest'));
const ReverseImageVsTest = lazy(() => import('./pages/ReverseImageVsTest'));
const Policies = lazy(() => import('./mainPages/Policies.tsx'));
const AuthCallback = lazy(() => import('./components/auth/AuthCallback.tsx'));
const SubscriptionSuccess = lazy(() => import('./mainPages/SubscriptionSuccess.tsx'));

// Loading component for lazy loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-white dark:bg-[#1a1a1a] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-[#0095FF] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Wrapper component for lazy loaded pages
const LazyPageWrapper = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Configure router with future flags
const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/search', element: <LazyPageWrapper><SearchResults /></LazyPageWrapper> },
        { path: '/pro-search', element: <LazyPageWrapper><ProSearchResults /></LazyPageWrapper> },
        { path: '/pro-search-test', element: <LazyPageWrapper><ProSearchTest /></LazyPageWrapper> },
        { path: '/deep-research', element: <LazyPageWrapper><DeepResearchResults /></LazyPageWrapper> },
        { path: '/insights-results', element: <LazyPageWrapper><InsightsResults /></LazyPageWrapper> },
        { path: '/tavily-search', element: <LazyPageWrapper><TavilySearchTest /></LazyPageWrapper> },
        { path: '/research-results', element: <LazyPageWrapper><ResearcherResults /></LazyPageWrapper> },
        { path: '/researcher-results', element: <LazyPageWrapper><ResearcherResults /></LazyPageWrapper> },
        { path: '/labs-results', element: <LazyPageWrapper><LabsResults /></LazyPageWrapper> },
        { path: '/pro-labs-results', element: <LazyPageWrapper><LabsResults /></LazyPageWrapper> },
        { path: '/settings', element: <LazyPageWrapper><Settings /></LazyPageWrapper> },
        { path: '/policies', element: <LazyPageWrapper><Policies /></LazyPageWrapper> },
  { path: '/auth/callback', element: <LazyPageWrapper><AuthCallback /></LazyPageWrapper> },
  { path: '/subscription/success', element: <LazyPageWrapper><SubscriptionSuccess /></LazyPageWrapper> },
  { path: '/test', element: <LazyPageWrapper><TestPage /></LazyPageWrapper> }
    ,{ path: '/image-test', element: <LazyPageWrapper><ImageTest /></LazyPageWrapper> }
    ,{ path: '/serp-test', element: <LazyPageWrapper><SerpApiTest /></LazyPageWrapper> }
    ,{ path: '/reverse-image-vs', element: <LazyPageWrapper><ReverseImageVsTest /></LazyPageWrapper> }
      ]
    }
  ]
);

// Configure error handling for unhandled promises
globalThis.addEventListener('unhandledrejection', (event) => {
  // Suppress Supabase "Invalid Refresh Token" errors for guest users
  const errorMessage = event.reason?.message || String(event.reason);
  if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('Refresh Token Not Found')) {
    console.warn('Supabase refresh token error suppressed (guest mode)');
    event.preventDefault();
    return;
  }
  
  logger.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  });
  event.preventDefault();
});

// Configure error handling for uncaught errors
globalThis.addEventListener('error', (event) => {
  // Suppress Supabase auth errors
  const errorMessage = event.message || '';
  if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('Refresh Token Not Found')) {
    console.warn('Supabase auth error suppressed (guest mode)');
    event.preventDefault();
    return;
  }
  
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