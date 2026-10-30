import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "build/**", ".netlify/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Disable the "React must be in scope" rule since we use the new JSX transform
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // Disable prop-types since we use TypeScript for type checking
      "react/prop-types": "off",
      // Apostrophes and quotes in JSX text render fine.
      "react/no-unescaped-entities": "off",
      // tsc checks the types; `any` stays allowed at the edges (API payloads, test pages, logger args).
      "@typescript-eslint/no-explicit-any": "off",
      // Streaming readers loop with while (true) and break.
      "no-constant-condition": ["error", { checkLoops: false }],
      // A leading underscore marks a deliberately unused name.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    plugins: { "react-hooks": pluginReactHooks },
    rules: pluginReactHooks.configs.recommended.rules,
  },
  {
    // Edge functions run on Deno; scripts and Netlify functions on Node.
    files: ["supabase/functions/**", "netlify/**", "scripts/**", "services/**", "*.mjs", "*.js"],
    languageOptions: { globals: { ...globals.node, Deno: "readonly", EdgeRuntime: "readonly" } },
  },
  {
    // Deno code: `// @ts-ignore: Deno global` is the convention there, and deno check types it.
    files: ["supabase/functions/**"],
    rules: { "@typescript-eslint/ban-ts-comment": "off" },
  },
];