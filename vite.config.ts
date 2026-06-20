import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { ConfigEnv, UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig((_: ConfigEnv): UserConfig => {
  // Load environment variables (only if needed for other configurations)
  // const env = loadEnv(mode, process.cwd(), '');

  // Environment variables loaded (debug output removed for cleaner development experience)

  const proxyConfig = {
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
      open: 'http://localhost:5173', // Auto-open only localhost:5173
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
            'vendor-openai': ['openai'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-stripe': ['@stripe/stripe-js'],
            'vendor-utils': ['axios', 'zod'],
            
            // Service chunks - separate by domain
            'services-search': [
              './src/services/legacy-search/searchService.ts',
              './src/services/legacy-search/pro/agents/swarmController.ts',
              './src/services/legacy-search/regular/agents/searchRetrieverAgent.ts',
              './src/services/legacy-search/regular/agents/searchWriterAgent.ts'
            ],
            // 'services-research' chunk removed — research pages are temporarily disabled.
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
              './src/commonService/searchTools/searxng.ts'
            ],
            
            // Component chunks - separate heavy components
            // (research pages removed — temporarily disabled)
            'components-results': [
              './src/services/legacy-search/pro/pages/ProSearchResults.tsx'
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
