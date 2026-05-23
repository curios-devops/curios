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
const FastSearchResults = lazy(() => import('./services/fast-search/pages/FastSearchResults.tsx'));
const AvatarSearchResults = lazy(() => import('./services/search/avatar/pages/AvatarSearchResults.tsx'));
const DeepResearchResults = lazy(() => import('./services/research/pro/pages/ResearchResults.tsx'));
const ProSearchResults = lazy(() => import('./services/search/pro/pages/ProSearchResults.tsx'));
const ProSearchTest = lazy(() => import('./services/search/pro/pages/ProSearchTest.tsx'));
const InsightsResults = lazy(() => import('./services/research/regular/pages/InsightsResults.tsx'));
const TavilySearchTest = lazy(() => import('./services/research/regular/pages/TavilySearchTest.tsx'));
const ResearcherResults = lazy(() => import('./services/research/pro/pages/ResearcherResults.tsx'));
// const LabsResults = lazy(() => import('./services/lab/regular/pages/LabsResults.tsx')); // Replaced by Studio
const StudioResults = lazy(() => import('./services/studio/pages/StudioResults.tsx'));
const CinematicResults = lazy(() => import('./services/cinematic/pages/CinematicResults.tsx'));
const Explore = lazy(() => import('./mainPages/Explore.tsx'));
const ArticleDetail = lazy(() => import('./mainPages/ArticleDetail.tsx'));
const Settings = lazy(() => import('./mainPages/Settings.tsx'));
const TestPage = lazy(() => import('./pages/test.tsx'));
const ImageTest = lazy(() => import('./pages/ImageTest.tsx'));
const SerpApiTest = lazy(() => import('./pages/SerpApiTest'));
const ReverseImageVsTest = lazy(() => import('./pages/ReverseImageVsTest'));
const AnamAvatarTest = lazy(() => import('./services/search/avatar/components/AnamAvatarTest.tsx'));
// Phase6TestPage removed - obsolete chunk rendering test
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
        { path: '/explore', element: <LazyPageWrapper><Explore /></LazyPageWrapper> },
        { path: '/explore/:articleId', element: <LazyPageWrapper><ArticleDetail /></LazyPageWrapper> },
        { path: '/search', element: <LazyPageWrapper><SearchResults /></LazyPageWrapper> },
        { path: '/fast-search', element: <LazyPageWrapper><FastSearchResults /></LazyPageWrapper> },
        { path: '/avatar-search', element: <LazyPageWrapper><AvatarSearchResults /></LazyPageWrapper> },
        { path: '/pro-search', element: <LazyPageWrapper><ProSearchResults /></LazyPageWrapper> },
        { path: '/pro-search-test', element: <LazyPageWrapper><ProSearchTest /></LazyPageWrapper> },
        { path: '/deep-research', element: <LazyPageWrapper><DeepResearchResults /></LazyPageWrapper> },
        { path: '/insights-results', element: <LazyPageWrapper><InsightsResults /></LazyPageWrapper> },
        { path: '/tavily-search', element: <LazyPageWrapper><TavilySearchTest /></LazyPageWrapper> },
        { path: '/research-results', element: <LazyPageWrapper><ResearcherResults /></LazyPageWrapper> },
        { path: '/researcher-results', element: <LazyPageWrapper><ResearcherResults /></LazyPageWrapper> },
        // Labs routes replaced by Studio
        // { path: '/labs-results', element: <LazyPageWrapper><LabsResults /></LazyPageWrapper> },
        // { path: '/pro-labs-results', element: <LazyPageWrapper><LabsResults /></LazyPageWrapper> },
        { path: '/labs-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/pro-labs-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/cinematic-results', element: <LazyPageWrapper><CinematicResults /></LazyPageWrapper> },
        { path: '/studio/results', element: <LazyPageWrapper><StudioResults /></LazyPageWrapper> },
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

// Configure error handling for uncaught errors
globalThis.addEventListener('error', (event) => {
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
      <RouterProvider
        router={router}
        future={{
          v7_startTransition: true,
        }}
      />
    </AuthProvider>
  </ErrorBoundary>
);
// 🧪 Exponer tests de diagnóstico en desarrollo
if (import.meta.env.DEV) {
  // Test granulares (recomendados)
  // @ts-ignore
  window.testLevel1 = async () => {
    const { testLevel1_CanvasPuro } = await import('./services/studio/test/testGranular');
    return testLevel1_CanvasPuro();
  };
  // @ts-ignore
  window.testLevel2 = async () => {
    const { testLevel2_ConDataURI } = await import('./services/studio/test/testGranular');
    return testLevel2_ConDataURI();
  };
  // @ts-ignore
  window.testLevel3 = async () => {
    const { testLevel3_ImagenExterna } = await import('./services/studio/test/testGranular');
    return testLevel3_ImagenExterna();
  };
  // @ts-ignore
  window.testLevel4 = async () => {
    const { testLevel4_FlujoRealConDataURI } = await import('./services/studio/test/testGranular');
    return testLevel4_FlujoRealConDataURI();
  };
  // @ts-ignore
  window.testLevel5 = async () => {
    const { testLevel5_FlujoRealConBrave } = await import('./services/studio/test/testGranular');
    return testLevel5_FlujoRealConBrave();
  };
  // @ts-ignore
  window.testLevel6 = async () => {
    const { testLevel6_VideoConAudio } = await import('./services/studio/test/testGranular');
    return testLevel6_VideoConAudio();
  };
  // @ts-ignore
  window.testAllLevels = async () => {
    const { testAllLevels } = await import('./services/studio/test/testGranular');
    return testAllLevels();
  };
  
  // Test original
  // @ts-ignore
  window.testNoAudio = async () => {
    const { testNoAudio } = await import('./services/studio/test/testNoAudio');
    return testNoAudio();
  };

  // 🌍 Tests de Global Image Search (NUEVO)
  // @ts-ignore
  window.testGlobalSearch_Level1 = async () => {
    const { testGlobalSearch_Level1 } = await import('./services/studio/test/testGlobalImageSearch');
    return testGlobalSearch_Level1();
  };
  // @ts-ignore
  window.testGlobalSearch_Level2 = async () => {
    const { testGlobalSearch_Level2 } = await import('./services/studio/test/testGlobalImageSearch');
    return testGlobalSearch_Level2();
  };
  // @ts-ignore
  window.testGlobalSearch_Level3 = async () => {
    const { testGlobalSearch_Level3 } = await import('./services/studio/test/testGlobalImageSearch');
    return testGlobalSearch_Level3();
  };
  // @ts-ignore
  window.testGlobalSearch_Level4 = async () => {
    const { testGlobalSearch_Level4 } = await import('./services/studio/test/testGlobalImageSearch');
    return testGlobalSearch_Level4();
  };
  // @ts-ignore
  window.testAllGlobalSearch = async () => {
    const { testAllGlobalSearch } = await import('./services/studio/test/testGlobalImageSearch');
    return testAllGlobalSearch();
  };
  
  console.log('🧪 Tests disponibles:');
  console.log('   testLevel1()     - Canvas puro (sin imágenes)');
  console.log('   testLevel2()     - Con imágenes Data URI');
  console.log('   testLevel3()     - Con imagen externa');
  console.log('   testLevel4()     - Flujo real + Data URI');
  console.log('   testLevel5()     - Flujo real + Brave');
  console.log('   testLevel6()     - Flujo real + Audio + Video ✨');
  console.log('   testAllLevels()  - Ejecutar todos en secuencia');
  console.log('   testNoAudio()    - Test original');
  console.log('');
  console.log('🌍 Tests de Global Image Search (NUEVO):');
  console.log('   testGlobalSearch_Level1() - Búsqueda simple');
  console.log('   testGlobalSearch_Level2() - Asignación a capítulos');
  console.log('   testGlobalSearch_Level3() - Flujo completo (1 capítulo)');
  console.log('   testGlobalSearch_Level4() - Flujo completo (3 capítulos)');
  console.log('   testAllGlobalSearch()     - Ejecutar todos (Global Search)');
}
