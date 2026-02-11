// Global type declarations
declare global {
  interface Window {
    testNoAudio?: () => Promise<any>;
    testLevel1?: () => Promise<any>;
    testLevel2?: () => Promise<any>;
    testLevel3?: () => Promise<any>;
    testLevel4?: () => Promise<any>;
    testLevel5?: () => Promise<any>;
    testAllLevels?: () => Promise<any>;
  }
}

export {};
