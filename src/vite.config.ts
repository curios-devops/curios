import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleRequest } from './api';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    open: true,
    // Add middleware to handle API routes
    middleware: [
      {
        name: 'api-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            
            // Only handle /api routes
            if (!url.pathname.startsWith('/api')) {
              return next();
            }

            try {
              const response = await handleRequest(req as Request);
              
              // Set response headers
              for (const [key, value] of response.headers.entries()) {
                res.setHeader(key, value);
              }
              
              // Set status code
              res.statusCode = response.status;
              
              // Send response body
              const body = await response.text();
              res.end(body);
            } catch (error) {
              console.error('API error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Internal server error' 
              }));
            }
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