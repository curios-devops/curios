// Test script for LinkedIn sharing optimization
// This simulates the sharing flow to ensure proper URL generation

// Test data similar to what would come from a real search
const testData = {
  query: "artificial intelligence future trends",
  text: "Artificial intelligence is rapidly evolving with significant advancements in machine learning and natural language processing. Recent developments in AI technology suggest transformative changes across industries, from healthcare to finance, as organizations leverage automation and intelligent systems to enhance productivity and innovation.",
  images: [{ url: "https://example.com/test-image.jpg", alt: "AI visualization" }]
};

// Simulate the snippet extraction logic from ShareMenu.tsx
function extractSnippet(text, query) {
  let shareSnippet = '';
  
  if (text && text.length > 20) {
    // Clean text and get first sentence only
    const cleanText = text.replace(/\*\*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const firstSentence = cleanText.split(/[.!?]/)[0].trim();
    
    // Use first sentence if it's substantial and not too long
    if (firstSentence.length > 15 && firstSentence.length < 150) {
      shareSnippet = firstSentence + '.';
    }
  }
  
  // Enhanced fallback to simple description
  if (!shareSnippet) {
    shareSnippet = `Get AI-powered insights and comprehensive analysis for "${query}" with CuriosAI.`;
  }
  
  // Ensure snippet is within LinkedIn's optimal length (70-160 chars for best display)
  if (shareSnippet.length > 160) {
    shareSnippet = shareSnippet.substring(0, 157) + '...';
  } else if (shareSnippet.length < 70 && shareSnippet.length > 0) {
    // If snippet is too short, enhance it slightly
    shareSnippet = `${shareSnippet} Discover comprehensive AI insights with CuriosAI.`;
    if (shareSnippet.length > 160) {
      shareSnippet = shareSnippet.substring(0, 157) + '...';
    }
  }
  
  return shareSnippet;
}

// Test the extraction
const shareQuery = testData.query.trim();
const shareSnippet = extractSnippet(testData.text, shareQuery);
const shareImage = testData.images && testData.images.length > 0 ? testData.images[0].url : '';

// Generate URLs
const shareUrl = `https://curiosai.com/.netlify/functions/share?query=${encodeURIComponent(shareQuery)}&snippet=${encodeURIComponent(shareSnippet)}${shareImage ? `&image=${encodeURIComponent(shareImage)}` : ''}`;
const postTitle = shareQuery;
const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(postTitle)}`;

// Output results
console.log('🔥 LinkedIn Share Test Results:');
console.log('================================');
console.log('Query:', shareQuery);
console.log('Snippet length:', shareSnippet.length);
console.log('Snippet:', shareSnippet);
console.log('');
console.log('Share URL:', shareUrl);
console.log('');
console.log('LinkedIn URL:', linkedInUrl);
console.log('');
console.log('Post Title (for composition box):', postTitle);
console.log('');

// Validate snippet length
const isOptimalLength = shareSnippet.length >= 70 && shareSnippet.length <= 160;
console.log('✅ Snippet length optimal (70-160 chars):', isOptimalLength);
console.log('✅ URLs properly encoded:', shareUrl.includes('%') && linkedInUrl.includes('%'));
console.log('✅ All required parameters present:', shareQuery && shareSnippet && shareUrl);
