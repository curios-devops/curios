/**
 * CinematicAI Usage Example
 *
 * This file demonstrates how to use the CinematicAI service
 * to generate cinematic videos from user queries.
 */

import { CinematicOrchestrator } from './agents/CinematicOrchestrator';
import { CinematicProgress } from './types';

/**
 * Example 1: Basic Usage
 */
async function basicExample() {
  console.log('=== Example 1: Basic Usage ===\n');

  const orchestrator = new CinematicOrchestrator();

  try {
    const video = await orchestrator.generateCinematicVideo(
      'Why do octopuses have 3 hearts?',
      'vertical'
    );

    console.log('✅ Video generated successfully!');
    console.log('Video ID:', video.id);
    console.log('Duration:', video.duration, 'seconds');
    console.log('Scenes:', video.recipe.scenes.length);
    console.log('Final URL:', video.finalVideoUrl);
  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

/**
 * Example 2: With Progress Tracking
 */
async function progressExample() {
  console.log('=== Example 2: With Progress Tracking ===\n');

  const orchestrator = new CinematicOrchestrator();

  try {
    const video = await orchestrator.generateCinematicVideo(
      'How do black holes work?',
      'horizontal',
      (progress: CinematicProgress) => {
        // Update UI with progress
        console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);

        // Show scene progress
        if (progress.sceneProgress) {
          const completed = progress.sceneProgress.filter(s => s.status === 'completed').length;
          const total = progress.sceneProgress.length;
          console.log(`  Scenes: ${completed}/${total} complete`);
        }
      }
    );

    console.log('\n✅ Video complete!');
    console.log('Title:', video.title);
    console.log('Description:', video.description);
    console.log('Generation time:', video.generationTimeMs, 'ms');
  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

/**
 * Example 3: Detailed Scene Information
 */
async function sceneDetailsExample() {
  console.log('=== Example 3: Scene Details ===\n');

  const orchestrator = new CinematicOrchestrator();

  try {
    const video = await orchestrator.generateCinematicVideo(
      'Why is the sky blue?',
      'vertical'
    );

    console.log('✅ Video generated!\n');
    console.log('Scene breakdown:');

    video.recipe.scenes.forEach((scene, index) => {
      console.log(`\nScene ${index + 1}: ${scene.type.toUpperCase()}`);
      console.log('  Text:', scene.text);
      console.log('  Duration:', scene.duration, 'seconds');
      console.log('  Emotion:', scene.emotion);
      console.log('  Camera:', scene.cameraMotion);
      console.log('  Lighting:', scene.lighting);

      const videoUrl = video.sceneVideos.get(scene.id);
      console.log('  Video URL:', videoUrl ? videoUrl.substring(0, 50) + '...' : 'N/A');
    });

    console.log('\nRelated queries:');
    video.recipe.relatedQueries?.forEach((query, i) => {
      console.log(`  ${i + 1}. ${query}`);
    });
  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

/**
 * Example 4: Error Handling
 */
async function errorHandlingExample() {
  console.log('=== Example 4: Error Handling ===\n');

  const orchestrator = new CinematicOrchestrator();

  try {
    // Check if Sora is available before starting
    const soraAvailable = await orchestrator.checkSoraAvailability();

    if (!soraAvailable) {
      console.warn('⚠️  Sora API not available. Using mock data or skipping generation.');
      return;
    }

    await orchestrator.generateCinematicVideo(
      'What is quantum entanglement?',
      'horizontal',
      (progress) => {
        // Track progress
        if (progress.sceneProgress) {
          // Check for failed scenes
          const failedScenes = progress.sceneProgress.filter(s => s.status === 'failed');
          if (failedScenes.length > 0) {
            console.error('⚠️  Some scenes failed to generate:');
            failedScenes.forEach(s => {
              console.error(`  - Scene ${s.sceneIndex + 1}: ${s.error}`);
            });
          }
        }
      }
    );

    console.log('✅ Video completed despite any scene failures');
  } catch (error) {
    console.error('❌ Critical error:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

/**
 * Example 5: Different Categories
 */
async function categoriesExample() {
  console.log('=== Example 5: Different Categories ===\n');

  const orchestrator = new CinematicOrchestrator();

  const queries = [
    'Why do stars twinkle?',        // Science
    'How do dolphins communicate?',  // Nature
    'Why were pyramids built?',      // History
    'What makes music emotional?',   // Culture
    'How does AI learn?',            // Technology
  ];

  for (const query of queries) {
    try {
      console.log(`\nGenerating: "${query}"`);

      const video = await orchestrator.generateCinematicVideo(query, 'vertical');

      console.log(`✅ ${video.recipe.category.toUpperCase()} video complete`);
      console.log(`   Duration: ${video.duration}s`);
      console.log(`   Scenes: ${video.recipe.scenes.length}`);
    } catch (error) {
      console.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Run examples
 * Uncomment the example you want to run
 */
async function main() {
  // await basicExample();
  // await progressExample();
  // await sceneDetailsExample();
  // await errorHandlingExample();
  // await categoriesExample();

  console.log('\n💡 Uncomment an example in main() to run it');
  console.log('⚠️  Note: Requires VITE_OPENAI_API_KEY with Sora access\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  basicExample,
  progressExample,
  sceneDetailsExample,
  errorHandlingExample,
  categoriesExample,
};
