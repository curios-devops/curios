import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import type { ConfigEnv, UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  // Environment variables loaded (debug output removed for cleaner development experience)

  const proxyConfig = {
    // Proxy API requests to Brave Search API - PUT THESE FIRST!
    '^/api/brave/web/search': {
      target: 'https://api.search.brave.com/res/v1',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/api\/brave/, ''),
      headers: {
        'X-Subscription-Token': env.VITE_BRAVE_API_KEY || ''
      }
    },
    '^/api/brave/images/search': {
      target: 'https://api.search.brave.com/res/v1',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/api\/brave/, ''),
      headers: {
        'X-Subscription-Token': env.VITE_BRAVE_API_KEY || ''
      }
    },
    // Legacy Netlify functions replaced by Supabase Edge Functions
    // Supabase handles all API calls now
  };

  return {
    plugins: [react({
      // This enables Fast Refresh for .tsx files
      include: '**/*.tsx'
    })],
    resolve: {
      // Ensure .ts and .tsx files are resolved
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },
    server: {
      host: '0.0.0.0',
      port: 5173, // Fixed: Use port 5173 as per project memory
      strictPort: true, // Don't try to find another port if 5173 is in use
      open: true, // Only Vite will open browser, Netlify dev won't
      proxy: proxyConfig,
      fs: {
        allow: ['..']
      },
      watch: {
        usePolling: true
      }
    },
    define: {
      'process.env': {}
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    },
    build: {
      target: 'es2020',
      commonjsOptions: {
        transformMixedEsModules: true
      },
      chunkSizeWarningLimit: 500, // Further reduce warning threshold to 500KB
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - separate large libraries
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'react-markdown'],
            'vendor-openai': ['openai', '@openai/agents'],
            'vendor-supabase': ['@supabase/supabase-js', '@supabase/ssr'],
            'vendor-stripe': ['@stripe/stripe-js'],
            'vendor-utils': ['axios', 'zod'],
            
            // Service chunks - separate by domain
            'services-search': [
              './src/services/search/searchService.ts',
              './src/services/search/pro/agents/swarmController.ts',
              './src/services/search/regular/agents/searchRetrieverAgent.ts',
              './src/services/search/regular/agents/searchWriterAgent.ts'
            ],
            'services-research': [
              './src/services/research/pro/agents/researcherWorkflow.ts',
              './src/services/research/regular/agents/insightsWorkflow.ts',
              './src/services/research/searchAgent.ts',
              './src/services/research/plannerAgent.ts'
            ],
            'services-lab': [
              './src/services/lab/regular/agents/orchestrator.ts'
            ],
            
            // Common service chunks - reduced to avoid circular dependencies
            'common-service': [
              './src/commonService/utils/constants.ts',
              './src/commonService/utils/types.ts'
            ],
            
            // Search tools in separate chunk to prevent initialization issues
            'search-tools': [
              './src/commonService/searchTools/tavily.ts',
              './src/commonService/searchTools/brave.ts',
              './src/commonService/searchTools/searxng.ts'
            ],
            
            // Component chunks - separate heavy components
            'components-results': [
              './src/services/lab/regular/pages/LabsResults.tsx',
              './src/services/research/pro/pages/ResearchResults.tsx',
              './src/services/search/pro/pages/ProSearchResults.tsx',
              './src/services/research/regular/pages/InsightsResults.tsx'
            ],
            'components-auth': [
              './src/components/auth/AuthModal.tsx',
              './src/components/auth/EmailForm.tsx',
              './src/components/auth/buttons/GoogleButton.tsx'
            ]
          }
        }
      }
    }
  };
});
