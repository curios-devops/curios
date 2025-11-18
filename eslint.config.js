import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "build/**"],
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
    },
  },
];