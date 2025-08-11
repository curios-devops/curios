// Test the enhanced description logic locally
function testEnhancedDescription() {
  const escapeHtml = (text) => 
    text.replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));

  // Test cases
  const testCases = [
    {
      name: "LinkedIn example from user",
      query: "Meta's Smart Wristband Can Control Devices Like Tom Cruise in 'Minority Report'",
      snippet: "Meta's new smart wristband technology allows users to control devices through neural interface..."
    },
    {
      name: "Another example", 
      query: "Benefits of renewable energy",
      snippet: "Solar and wind power are clean alternatives to fossil fuels, reducing carbon emissions and environmental impact."
    },
    {
      name: "Long snippet",
      query: "How does AI impact modern business?",
      snippet: "Artificial intelligence is transforming business operations through automation, data analysis, and customer experience improvements, leading to increased efficiency and innovation across multiple industries."
    }
  ];

  console.log('🧪 Testing Enhanced LinkedIn Description Format\n');

  testCases.forEach(testCase => {
    const { query, snippet } = testCase;
    
    // Apply the same logic as in share.js
    const safeQuery = escapeHtml(query.slice(0, 100));
    
    let enhancedDescription;
    if (snippet && snippet.trim() && query !== "CuriosAI - AI-Powered Search") {
      const shortSnippet = snippet.slice(0, 120).trim();
      const needsEllipsis = snippet.length > 120 || !shortSnippet.endsWith('.') && !shortSnippet.endsWith('!') && !shortSnippet.endsWith('?');
      enhancedDescription = `${shortSnippet}${needsEllipsis ? '...' : ''} Visit curiosai.com for complete insights and analysis.`;
    } else {
      enhancedDescription = "Discover comprehensive insights with AI-powered search and analysis at curiosai.com";
    }
    
    const safeSnippet = escapeHtml(enhancedDescription.slice(0, 155));
    
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`📰 LinkedIn Title (og:title): "${safeQuery}"`);
    console.log(`📝 LinkedIn Description (og:description): "${safeSnippet}"`);
    console.log('─'.repeat(80));
  });
}

testEnhancedDescription();
