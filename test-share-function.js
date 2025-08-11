// Test the share function locally (CommonJS compatible)
const { handler } = require('./netlify/functions/share.js');

async function testFunction() {
  console.log('🧪 Testing Share Function...\n');

  try {
    // Test 1: Bot request (LinkedIn crawler)
    console.log('📱 Test 1: LinkedIn Bot Request');
    const botEvent = {
      queryStringParameters: {
        query: 'What is artificial intelligence?',
        snippet: 'Artificial intelligence (AI) is a branch of computer science that aims to create machines capable of intelligent behavior. It involves developing algorithms and systems that can perform tasks typically requiring human intelligence.'
      },
      headers: {
        'user-agent': 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +https://www.linkedin.com/)'
      }
    };

    const botResult = await handler(botEvent, {});
    console.log('✅ Bot Response Status:', botResult.statusCode);
    console.log('🔍 Bot Response includes meta refresh:', botResult.body.includes('meta http-equiv="refresh"'));
    console.log('🔍 Bot Response includes JavaScript redirect:', botResult.body.includes('window.location.replace'));
    console.log('🔍 Bot Response includes static content:', botResult.body.includes('View Full Results'));
    console.log('🔍 Bot Response includes og:title:', botResult.body.includes('og:title'));

    console.log('\n📱 Test 2: Real User Request');
    const userEvent = {
      queryStringParameters: {
        query: 'What is artificial intelligence?',
        snippet: 'Artificial intelligence (AI) is a branch of computer science that aims to create machines capable of intelligent behavior.'
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    const userResult = await handler(userEvent, {});
    console.log('✅ User Response Status:', userResult.statusCode);
    console.log('🔍 User Response includes meta refresh:', userResult.body.includes('meta http-equiv="refresh"'));
    console.log('🔍 User Response includes JavaScript redirect:', userResult.body.includes('window.location.replace'));
    console.log('🔍 User Response redirects to search:', userResult.body.includes('/search?q='));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFunction();
