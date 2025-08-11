#!/usr/bin/env node
// LinkedIn Sharing Test Suite
const fs = require('fs');
const path = require('path');

console.log('🔍 LinkedIn Sharing Functionality Test\n');

// Test 1: Verify og-image.ts function
console.log('1. Testing og-image.ts function...');
try {
  const ogImagePath = path.join(__dirname, 'netlify/functions/og-image.ts');
  const ogImageContent = fs.readFileSync(ogImagePath, 'utf8');
  
  // Check LinkedIn dimensions
  const hasLinkedInDimensions = ogImageContent.includes('width="1200" height="627"');
  console.log(`   ✅ LinkedIn dimensions (1200x627): ${hasLinkedInDimensions ? 'PASS' : 'FAIL'}`);
  
  // Check proper SVG structure
  const hasSVGStructure = ogImageContent.includes('<svg') && ogImageContent.includes('</svg>');
  console.log(`   ✅ SVG structure: ${hasSVGStructure ? 'PASS' : 'FAIL'}`);
  
  // Check query parameter handling
  const hasQueryHandling = ogImageContent.includes('query') && ogImageContent.includes('snippet');
  console.log(`   ✅ Query/snippet handling: ${hasQueryHandling ? 'PASS' : 'FAIL'}`);
  
} catch (e) {
  console.log(`   ❌ og-image.ts test failed: ${e.message}`);
}

// Test 2: Verify social-meta.ts edge function
console.log('\n2. Testing social-meta.ts edge function...');
try {
  const socialMetaPath = path.join(__dirname, 'netlify/edge-functions/social-meta.ts');
  const socialMetaContent = fs.readFileSync(socialMetaPath, 'utf8');
  
  // Check LinkedIn meta tags
  const hasLinkedInMeta = socialMetaContent.includes('og:image:width') && 
                          socialMetaContent.includes('og:image:height') &&
                          socialMetaContent.includes('1200') &&
                          socialMetaContent.includes('627');
  console.log(`   ✅ LinkedIn meta tags: ${hasLinkedInMeta ? 'PASS' : 'FAIL'}`);
  
  // Check required social tags
  const hasSocialTags = socialMetaContent.includes('og:title') && 
                        socialMetaContent.includes('og:description') &&
                        socialMetaContent.includes('twitter:card');
  console.log(`   ✅ Social media tags: ${hasSocialTags ? 'PASS' : 'FAIL'}`);
  
} catch (e) {
  console.log(`   ❌ social-meta.ts test failed: ${e.message}`);
}

// Test 3: Verify metaTags.ts utility
console.log('\n3. Testing metaTags.ts utility...');
try {
  const metaTagsPath = path.join(__dirname, 'src/utils/metaTags.ts');
  const metaTagsContent = fs.readFileSync(metaTagsPath, 'utf8');
  
  // Check export functions
  const hasRequiredExports = metaTagsContent.includes('export function updateMetaTags') &&
                             metaTagsContent.includes('export function updateLinkedInMetaTags') &&
                             metaTagsContent.includes('export function generateShareableMetaTags');
  console.log(`   ✅ Required exports: ${hasRequiredExports ? 'PASS' : 'FAIL'}`);
  
  // Check imageUrl usage
  const usesImageUrl = metaTagsContent.includes('imageUrl ||');
  console.log(`   ✅ ImageUrl parameter usage: ${usesImageUrl ? 'PASS' : 'FAIL'}`);
  
} catch (e) {
  console.log(`   ❌ metaTags.ts test failed: ${e.message}`);
}

// Test 4: Verify netlify.toml configuration
console.log('\n4. Testing netlify.toml configuration...');
try {
  const netlifyTomlPath = path.join(__dirname, 'netlify.toml');
  const netlifyTomlContent = fs.readFileSync(netlifyTomlPath, 'utf8');
  
  // Check edge function routes
  const hasEdgeFunctions = netlifyTomlContent.includes('social-meta') &&
                           netlifyTomlContent.includes('/search');
  console.log(`   ✅ Edge function routes: ${hasEdgeFunctions ? 'PASS' : 'FAIL'}`);
  
} catch (e) {
  console.log(`   ❌ netlify.toml test failed: ${e.message}`);
}

// Generate test URLs
console.log('\n📋 Test URLs for LinkedIn Sharing:\n');

const baseUrl = 'https://curios.netlify.app';
const testQueries = [
  { query: 'AI Trends 2024', snippet: 'Exploring the latest developments in artificial intelligence and machine learning' },
  { query: 'Climate Change Solutions', snippet: 'Innovative approaches to addressing global warming and environmental challenges' },
  { query: 'Space Exploration', snippet: 'Recent discoveries and missions in space science and astronomy' }
];

testQueries.forEach((test, index) => {
  const encodedQuery = encodeURIComponent(test.query);
  const encodedSnippet = encodeURIComponent(test.snippet);
  
  console.log(`Test ${index + 1}: ${test.query}`);
  console.log(`OG Image: ${baseUrl}/.netlify/functions/og-image?query=${encodedQuery}&snippet=${encodedSnippet}`);
  console.log(`Search Page: ${baseUrl}/search?q=${encodedQuery}&snippet=${encodedSnippet}`);
  console.log('');
});

console.log('🎯 Expected LinkedIn Sharing Behavior:\n');
console.log('1. When sharing a search page URL, the edge function should inject dynamic meta tags');
console.log('2. The OG image should be generated with 1200x627 dimensions');
console.log('3. LinkedIn should display: Title, Description, and Custom Image');
console.log('4. The image should show CuriosAI branding with the search query and snippet');
console.log('5. All text should be properly escaped and truncated for optimal display');

console.log('\n✅ LinkedIn Sharing Test Complete!');
