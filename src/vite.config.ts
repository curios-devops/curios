import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
type NextFunction = (err?: unknown) => void;
import type { IncomingMessage, ServerResponse } from 'http';
import type { ViteDevServer } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      strictPort: true,
      hmr: {
        timeout: 30000, // Increase timeout to 30 seconds
        clientPort: 5173
      },
      open: true,
      proxy: {
        '/api/brave': {
          target: 'https://api.search.brave.com/res/v1',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/brave/, ''),
          headers: {
            'X-Subscription-Token': env.VITE_BRAVE_API_KEY || '',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'
          }
        }
      },
      middleware: [
        {
          name: 'cors-headers',
          configureServer(server: ViteDevServer) {
            server.middlewares.use((_req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
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
      strictPort: true
    }
  };
});