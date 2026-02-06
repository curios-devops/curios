/**
 * Test Remotion Setup
 * Simple test to verify Remotion can render a basic composition
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

async function testRemotion() {
  console.log('🎬 Testing Remotion setup...\n');
  
  try {
    // Step 1: Bundle the Remotion project
    console.log('📦 Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'remotion/src/index.ts'),
      onProgress: (progress) => {
        console.log(`   Bundling: ${Math.round(progress * 100)}%`);
      },
    });
    console.log('✅ Bundle complete!\n');
    
    // Step 2: Select composition
    console.log('🎯 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'StudioVertical',
    });
    console.log(`✅ Composition loaded: ${composition.id}`);
    console.log(`   Resolution: ${composition.width}x${composition.height}`);
    console.log(`   Duration: ${composition.durationInFrames} frames @ ${composition.fps} fps\n`);
    
    // Step 3: Render video (to test folder)
    console.log('🎥 Rendering test video...');
    const outputPath = path.join(process.cwd(), 'test-output', 'test-video.mp4');
    
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        console.log(
          `   Progress: ${Math.round(progress * 100)}% | ` +
          `Rendered: ${renderedFrames}/${composition.durationInFrames} | ` +
          `Encoded: ${encodedFrames}`
        );
      },
    });
    
    console.log('\n✅ Test video rendered successfully!');
    console.log(`📁 Location: ${outputPath}\n`);
    console.log('🎉 Remotion setup is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testRemotion();
