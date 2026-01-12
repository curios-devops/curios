/**
 * Test Shopping Intent Detection
 * Run this to validate the intent detection logic
 */

import { detectShoppingIntent, TEST_QUERIES } from './shopping-intent';

console.log('🛍️ Shopping Intent Detection Tests\n');

console.log('✅ SHOULD TRIGGER (Shopping Intent):');
console.log('─'.repeat(60));
TEST_QUERIES.shouldTrigger.forEach(query => {
  const result = detectShoppingIntent(query);
  console.log(`Query: "${query}"`);
  console.log(`  → Intent: ${result.isShoppingIntent ? '✓ YES' : '✗ NO'}`);
  console.log(`  → Confidence: ${result.confidence}%`);
  console.log(`  → Method: ${result.detectionMethod}`);
  console.log(`  → Matched: ${result.matchedTerms?.join(', ') || 'none'}`);
  console.log();
});

console.log('\n❌ SHOULD NOT TRIGGER (No Shopping Intent):');
console.log('─'.repeat(60));
TEST_QUERIES.shouldNotTrigger.forEach(query => {
  const result = detectShoppingIntent(query);
  console.log(`Query: "${query}"`);
  console.log(`  → Intent: ${result.isShoppingIntent ? '✓ YES (WRONG!)' : '✗ NO'}`);
  console.log(`  → Confidence: ${result.confidence}%`);
  console.log(`  → Method: ${result.detectionMethod}`);
  console.log(`  → Matched: ${result.matchedTerms?.join(', ') || 'none'}`);
  console.log();
});

// Calculate accuracy
const correctPositives = TEST_QUERIES.shouldTrigger.filter(
  q => detectShoppingIntent(q).isShoppingIntent
).length;

const correctNegatives = TEST_QUERIES.shouldNotTrigger.filter(
  q => !detectShoppingIntent(q).isShoppingIntent
).length;

const totalCorrect = correctPositives + correctNegatives;
const totalTests = TEST_QUERIES.shouldTrigger.length + TEST_QUERIES.shouldNotTrigger.length;
const accuracy = (totalCorrect / totalTests * 100).toFixed(1);

console.log('\n📊 Test Results:');
console.log('─'.repeat(60));
console.log(`Correct Positives: ${correctPositives}/${TEST_QUERIES.shouldTrigger.length}`);
console.log(`Correct Negatives: ${correctNegatives}/${TEST_QUERIES.shouldNotTrigger.length}`);
console.log(`Overall Accuracy: ${accuracy}%`);
console.log(`Goal: >85% accuracy ✓`);
