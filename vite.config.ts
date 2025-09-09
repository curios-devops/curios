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
    // Direct proxy to Netlify functions - simplified approach from forum solutions
    '/api/fetch-openai': {
      target: 'http://localhost:8888',
      changeOrigin: true,
      secure: false,
      rewrite: (_path: string) => '/.netlify/functions/fetch-openai'
    },
    // Proxy API requests to Brave Search API
    '^/api/brave/web/search': {
      target: 'https://api.search.brave.com/res/v1/web/search',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/api\/brave\/web\/search/, ''),
      headers: {
        'X-Subscription-Token': env.VITE_BRAVE_API_KEY || ''
      }
    },
    '^/api/brave/images/search': {
      target: 'https://api.search.brave.com/res/v1/images/search',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/api\/brave\/images\/search/, ''),
      headers: {
        'X-Subscription-Token': env.VITE_BRAVE_API_KEY || ''
      }
    }
  };

  return {
    plugins: [react()],
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
      }
    }
  };
});
