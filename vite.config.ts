import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import process from "node:process";

// Security headers configuration
const securityHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-RapidAPI-Key, X-RapidAPI-Host",
  "Content-Security-Policy":
    "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;",
};

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const _env = loadEnv(mode, process.cwd(), "");
  

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "react": path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
        "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
      },
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    server: {
      headers: {
        ...securityHeaders,
      },
      hmr: {
        overlay: false,
        timeout: 5000,
      },
      proxy: {
        "/api/stripe": {
          target: "https://api.stripe.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/stripe/, ""),
        },
      },
      open: true,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      port: parseInt(_env.PORT || "5173", 10),
    },
    preview: {
      headers: securityHeaders,
      host: true,
      strictPort: true,
      port: parseInt(_env.PORT || "5173", 10),
      open: false,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@stripe/stripe-js",
        "@supabase/supabase-js",
        "@supabase/ssr",
        "lucide-react",
      ],
      exclude: [],
      esbuildOptions: {
        target: "esnext",
        supported: {
          "top-level-await": true,
        },
      },
    },
    build: {
      sourcemap: true,
      outDir: "dist",
      assetsDir: "assets",
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["lucide-react"],
            "search-vendor": ["openai", "axios"],
            "auth-vendor": ["@supabase/supabase-js"],
          },
        },
        maxParallelFileOps: 2,
      },
    },
  };
});
