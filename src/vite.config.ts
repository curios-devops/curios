import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    open: true,
    proxy: {
      // ✅ NEW: Proxy for Brave API requests
      '/api/brave': {
        target: 'https://api.search.brave.com/res/v1',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/brave/, ''),
        headers: {
          'X-RapidAPI-Key': process.env.VITE_BRAVE_API_KEY || '',
          'X-RapidAPI-Host': 'api.search.brave.com',
          'Content-Type': 'application/json'
        }
      }
    },
    middleware: [
      {
        name: 'cors-headers',
        configureServer(server) {
          server.middlewares.use((_req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'X-RapidAPI-Key, X-RapidAPI-Host, Content-Type');
            next();
          });
        }
      }
    ]
  },
  preview: {
    port: 5173,
    host: true,
    strictPort: true,
    open: true
  }
});
