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
  const env = loadEnv(mode, process.cwd(), "");
  

  return {
    plugins: [
      react()
    ],
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
      port: parseInt(env.PORT || "5173", 10),
    },
    preview: {
      headers: securityHeaders,
      host: true,
      strictPort: true,
      port: parseInt(env.PORT || "5173", 10),
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
        "axios",
        "zod",
        "react-markdown"
      ],
      exclude: [
        // Exclude large dependencies that should be lazy loaded
        "pdf-lib",
        "@openai/agents"
      ],
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
            // Core React libraries
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            
            // UI and styling libraries
            "ui-vendor": ["lucide-react"],
            
            // Large utility libraries
            "utility-vendor": ["axios", "zod"],
            
            // AI and search related
            "ai-vendor": ["openai", "@openai/agents"],
            
            // Authentication and backend
            "auth-vendor": ["@supabase/supabase-js", "@supabase/ssr"],
            
            // Payment processing
            "payment-vendor": ["@stripe/stripe-js"],
            
            // Document processing (if used)
            "document-vendor": ["pdf-lib", "react-markdown"],
            
            // Split page components into separate chunks
            "page-search": ["./src/pages/SearchResults.tsx", "./src/pages/ProSearchResults.tsx"],
            "page-research": ["./src/pages/DeepResearchResults.tsx", "./src/pages/ResearcherResults.tsx", "./src/pages/InsightsResults.tsx"],
            "page-labs": ["./src/pages/LabsResults.tsx"],
            "page-settings": ["./src/pages/Settings.tsx", "./src/pages/Policies.tsx"],
            "page-auth": ["./src/pages/SubscriptionSuccess.tsx", "./src/components/auth/AuthCallback.tsx"]
          },
        },
        maxParallelFileOps: 4,
      },
      chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    },
  };
});
