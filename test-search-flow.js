// Test script to verify the search flow is working
import { SwarmController } from './src/services/agents/swarmController.ts';

async function testSearchFlow() {
  console.log('Testing Search Flow...');
  
  try {
    const controller = new SwarmController();
    
    // Test regular search (non-pro)
    console.log('Testing regular search flow...');
    const result = await controller.processQuery(
      'What is artificial intelligence?',
      (status) => console.log('Status:', status),
      false // isPro = false
    );
    
    console.log('Search flow completed successfully!');
    console.log('Result structure:', {
      hasResearch: !!result.research,
      hasArticle: !!result.article,
      hasImages: !!result.images,
      hasVideos: !!result.videos,
      resultsCount: result.research?.results?.length || 0
    });
    
  } catch (error) {
    console.error('Search flow test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testSearchFlow();