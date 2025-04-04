import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      // Add memory optimization settings
      port: 5173,
      host: true,
      strictPort: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      },
      hmr: {
        overlay: false,
        timeout: 5000
      },
      watch: {
        usePolling: false
      },
      open: true,
      watch: {
        usePolling: true,
        interval: 1000
      }
    },
    fs: {
      strict: false
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@stripe/stripe-js', 'lucide-react'],
      exclude: [],
      esbuildOptions: {
        target: 'esnext',
        supported: {
          'top-level-await': true
        }
      }
    },
    preview: {
      port: 5173,
      host: true,
      strictPort: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      },
      open: true
    },
    build: {
      sourcemap: true,
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      // Add chunking and optimization settings
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react'],
            'search-vendor': ['openai', 'axios'],
            'auth-vendor': ['@supabase/supabase-js']
          }
        },
        maxParallelFileOps: 2
      }
    }
  };
});