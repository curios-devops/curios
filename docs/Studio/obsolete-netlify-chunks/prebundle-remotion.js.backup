#!/usr/bin/env node
/**
 * Pre-bundle Remotion at build time to avoid 15s bundling on every render
 * This runs during Netlify build and creates a static bundle
 */

import { bundle } from '@remotion/bundler';
import { cpSync } from 'fs';
import { resolve } from 'path';

async function prebundle() {
  console.log('🎬 Pre-bundling Remotion...');
  
  const remotionRoot = resolve(process.cwd(), 'remotion/src/index.ts');
  const outputDir = resolve(process.cwd(), '.remotion-bundle');
  
  try {
    const bundleLocation = await bundle({
      entryPoint: remotionRoot,
      webpackOverride: (config) => config,
    });
    
    console.log('✅ Bundle created at:', bundleLocation);
    console.log('📦 Copying to:', outputDir);
    
    // Copy bundle to a predictable location
    cpSync(bundleLocation, outputDir, { recursive: true });
    
    console.log('✅ Pre-bundling complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Pre-bundling failed:', error);
    process.exit(1);
  }
}

prebundle();
