// TypeScript configuration to resolve Node.js type conflicts
// This file helps resolve duplicate identifier issues from multiple @types/node packages

declare global {
  // Skip declarations that are causing conflicts by re-declaring them as merged
  namespace NodeJS {
    interface Process {
      // Unify process types to prevent conflicts
      readonly platform: NodeJS.Platform;
      readonly arch: NodeJS.Architecture;
    }
  }
}

// This helps TypeScript understand that our declarations are intentional
export {};