// Test script to debug the search flow issue
import { performSearch } from './src/services/searchService.ts';

async function debugSearchFlow() {
  console.log('🔍 Starting debug search flow...');
  
  try {
    const testQuery = 'artificial intelligence recent developments';
    console.log(`📝 Test query: "${testQuery}"`);
    
    // Test the full search flow with status updates
    const result = await performSearch(testQuery, {
      isPro: false,
      onStatusUpdate: (status) => {
        console.log(`📊 Status Update: ${status}`);
      }
    });
    
    console.log('✅ Search completed successfully!');
    console.log('📈 Result summary:', {
      hasAnswer: !!result.answer,
      answerLength: result.answer?.length || 0,
      sourcesCount: result.sources?.length || 0,
      imagesCount: result.images?.length || 0,
      videosCount: result.videos?.length || 0,
      followUpQuestionsCount: result.followUpQuestions?.length || 0
    });
    
    // Show first 200 chars of answer
    if (result.answer) {
      console.log('📄 Answer preview:', result.answer.slice(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ Search flow failed:', error);
    console.error('🔧 Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}

// Run the debug test
debugSearchFlow();
