import { defineConfig, loadEnv } from 'vite';
import { Agent } from 'https';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  // Create a reusable HTTPS agent with keep-alive
  const httpsAgent = new Agent({
    keepAlive: true,
    timeout: 120000,
    rejectUnauthorized: true
  });

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true
    }
  };
});
