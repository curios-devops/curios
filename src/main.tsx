import { useState, useEffect, ReactNode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext.tsx';
import App from './App.tsx';
import Home from './mainPages/Home.tsx'; // Keep Home page eager loaded as it's the landing page
import { logger } from './utils/logger.ts';
import './index.css';
import { applyThemeColors, type AccentColor } from './config/themeColors';

// Apply theme synchronously before React renders — prevents black flash on load
(function applyInitialTheme() {
  const stored = localStorage.getItem('theme') || 'system';
  const accent = localStorage.getItem('accentColor') || 'blue';
  const validAccents = ['blue', 'teal', 'purple', 'orange', 'gray'];
  const safeAccent = (validAccents.includes(accent) ? accent : 'blue') as AccentColor;
  const effectiveTheme: 'light' | 'dark' =
    stored === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : stored === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  applyThemeColors(effectiveTheme, safeAccent);
})();

// Lazy load page components from their respective service directories
// Legacy search (hidden from the dropdown, slated for removal) now lives under services/legacy-search.
const SearchResults = lazy(() => import('./services/legacy-search/regular/pages/SearchResults.tsx'));
// Fast Search is now the primary "Search" and lives under services/search.
const FastSearchResults = lazy(() => import('./services/search/pages/FastSearchResults.tsx'));
const AvatarSearchResults = lazy(() => import('./services/legacy-search/avatar/pages/AvatarSearchResults.tsx'));
const ProSearchResults = lazy(() => import('./services/legacy-search/pro/pages/ProSearchResults.tsx'));
const ProSearchTest = lazy(() => import('./services/legacy-search/pro/pages/ProSearchTest.tsx'));
// Stories — regular workflow. Pro research was removed.
const StoriesResults = lazy(() => import('./services/stories/pages/StoriesResults.tsx'));
const CinematicResults = lazy(() => import('./services/cinematic/pages/CinematicResults.tsx'));
const MovieResults = lazy(() => import('./services/movie/pages/MovieResults.tsx'));
const MovieSharePage = lazy(() => import('./services/movie/pages/MovieSharePage.tsx'));
const Explore = lazy(() => import('./mainPages/Explore.tsx'));
const ArticleDetail = lazy(() => import('./mainPages/ArticleDetail.tsx'));
const Settings = lazy(() => import('./mainPages/Settings.tsx'));
const TestPage = lazy(() => import('./pages/test.tsx'));
const ImageTest = lazy(() => import('./pages/ImageTest.tsx'));
const SerpApiTest = lazy(() => import('./pages/SerpApiTest'));
const ReverseImageVsTest = lazy(() => import('./pages/ReverseImageVsTest'));
const AnamAvatarTest = lazy(() => import('./services/legacy-search/avatar/components/AnamAvatarTest.tsx'));
// Phase6TestPage removed - obsolete chunk rendering test
const Policies = lazy(() => import('./mainPages/Policies.tsx'));
const AuthCallback = lazy(() => import('./components/auth/AuthCallback.tsx'));
const SubscriptionSuccess = lazy(() => import('./mainPages/SubscriptionSuccess.tsx'));

// Loading component for lazy loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
      <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Loading...</p>
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
        { path: '/explore', element: <LazyPageWrapper><Explore /></LazyPageWrapper> },
        { path: '/explore/:articleId', element: <LazyPageWrapper><ArticleDetail /></LazyPageWrapper> },
        { path: '/search', element: <LazyPageWrapper><SearchResults /></LazyPageWrapper> },
        { path: '/fast-search', element: <LazyPageWrapper><FastSearchResults /></LazyPageWrapper> },
        { path: '/avatar-search', element: <LazyPageWrapper><AvatarSearchResults /></LazyPageWrapper> },
        { path: '/pro-search', element: <LazyPageWrapper><ProSearchResults /></LazyPageWrapper> },
        { path: '/pro-search-test', element: <LazyPageWrapper><ProSearchTest /></LazyPageWrapper> },
        { path: '/stories-results', element: <LazyPageWrapper><StoriesResults /></LazyPageWrapper> },
        // Pro research routes removed (legacy code deleted).
        // /labs-results routes now serve Cinematic
        { path: '/labs-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/pro-labs-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/cinematic-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/movie-results', element: <LazyPageWrapper><MovieResults /></LazyPageWrapper> },
        { path: '/movie/share/:id', element: <LazyPageWrapper><MovieSharePage /></LazyPageWrapper> },
        { path: '/settings', element: <LazyPageWrapper><Settings /></LazyPageWrapper> },
        { path: '/policies', element: <LazyPageWrapper><Policies /></LazyPageWrapper> },
  { path: '/auth/callback', element: <LazyPageWrapper><AuthCallback /></LazyPageWrapper> },
  { path: '/subscription/success', element: <LazyPageWrapper><SubscriptionSuccess /></LazyPageWrapper> },
  { path: '/test', element: <LazyPageWrapper><TestPage /></LazyPageWrapper> }
    ,{ path: '/image-test', element: <LazyPageWrapper><ImageTest /></LazyPageWrapper> }
    ,{ path: '/serp-test', element: <LazyPageWrapper><SerpApiTest /></LazyPageWrapper> }
    ,{ path: '/reverse-image-vs', element: <LazyPageWrapper><ReverseImageVsTest /></LazyPageWrapper> }
    ,{ path: '/anam-test', element: <LazyPageWrapper><AnamAvatarTest /></LazyPageWrapper> }
    // phase6-test route removed - obsolete chunk rendering test
      ]
    }
  ]
);

// Configure error handling for unhandled promises
globalThis.addEventListener('unhandledrejection', (event) => {
  // Suppress Supabase "Invalid Refresh Token" errors for guest users
  const errorMessage = event.reason?.message || String(event.reason);
  const errorStack = event.reason?.stack || '';
  
  if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('Refresh Token Not Found')) {
    console.warn('Supabase refresh token error suppressed (guest mode)');
    event.preventDefault();
    return;
  }
  
  // Suppress Stripe module loading errors (these are non-critical)
  // These errors come from Stripe's checkout page, not our code
  if (errorMessage.includes('Cannot find module') && errorMessage.includes("'./")) {
    if (process.env.NODE_ENV === 'development') {
      console.info('%c🔇 Suppressed Stripe Error', 'color: orange', 
        '\n📝 This is a known Stripe checkout page bug',
        '\n✅ Does not affect functionality',
        '\n🔗 Error from: Stripe\'s domain (not our code)',
        '\n💡 Users can still complete checkout successfully');
    }
    event.preventDefault();
    return;
  }
  
  // Suppress errors from Stripe's checkout page domain
  if (errorStack.includes('checkout.stripe.com') || errorStack.includes('cs_live_')) {
    if (process.env.NODE_ENV === 'development') {
      console.info('%c🔇 Suppressed Stripe Checkout Error', 'color: orange',
        '\n✅ Error from Stripe\'s page, not ours');
    }
    event.preventDefault();
    return;
  }
  
  // Suppress Supabase clock skew warnings (non-critical)
  if (errorMessage.includes('clock for skew') || errorMessage.includes('issued in the future')) {
    console.warn('Supabase clock skew warning suppressed (non-critical)');
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

// Suppress image loading errors globally (403, CORS, connection errors from third-party sources)
// Must use capture phase to catch image errors before they bubble
globalThis.addEventListener('error', (event) => {
  // Check if it's an image loading error
  if (event.target instanceof HTMLImageElement) {
    // Silently suppress - these are normal for third-party news images
    event.stopPropagation();
    event.preventDefault();
    return;
  }

  // Suppress Supabase auth errors
  const errorMessage = event.message || '';
  const errorFilename = event.filename || '';
  
  if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('Refresh Token Not Found')) {
    console.warn('Supabase auth error suppressed (guest mode)');
    event.preventDefault();
    return;
  }
  
  // Suppress Stripe module loading errors
  if (errorMessage.includes('Cannot find module') && errorMessage.includes("'./")) {
    console.warn('Stripe module loading error suppressed (Stripe-side issue, non-critical)');
    event.preventDefault();
    return;
  }
  
  // Suppress errors from Stripe's checkout page
  if (errorFilename.includes('checkout.stripe.com') || errorFilename.includes('cs_live_')) {
    console.warn('Stripe checkout page error suppressed (Stripe-side issue)');
    event.preventDefault();
    return;
  }
  
  // Suppress Supabase clock skew warnings
  if (errorMessage.includes('clock for skew') || errorMessage.includes('issued in the future')) {
    console.warn('Supabase clock skew warning suppressed (non-critical)');
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4" style={{ color: 'var(--ui-text-primary)' }}>Something went wrong</h1>
          <p className="mb-4" style={{ color: 'var(--ui-text-muted)' }}>We're sorry, but something went wrong. Please try refreshing the page.</p>
          <button
            onClick={() => globalThis.location.reload()}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
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
      <RouterProvider
        router={router}
        future={{
          v7_startTransition: true,
        }}
      />
    </AuthProvider>
  </ErrorBoundary>
);
