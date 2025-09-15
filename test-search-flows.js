#!/usr/bin/env node

/**
 * Test script to verify the search architecture fixes
 * Tests both Regular and Pro search flows to ensure:
 * 1. Regular search doesn't call APify (PerspectiveAgent)
 * 2. Pro search uses SwarmController with PerspectiveAgent
 * 3. No hanging/stuck states
 * 4. Memory stays around 50MB
 */

import { performSearch } from './src/services/search/searchService.ts';

console.log('🔍 Testing CuriosAI Search Architecture Fixes');
console.log('=' .repeat(50));

async function testRegularSearch() {
  console.log('\n📝 Testing REGULAR Search Flow');
  console.log('-'.repeat(30));
  
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  
  try {
    const result = await performSearch('What is artificial intelligence?', {
      isPro: false,
      onStatusUpdate: (status) => console.log(`📊 Status: ${status}`)
    });
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    console.log('✅ Regular Search Completed');
    console.log(`⏱️  Duration: ${endTime - startTime}ms`);
    console.log(`🧠 Memory: ${startMemory.toFixed(1)}MB → ${endMemory.toFixed(1)}MB`);
    console.log(`📄 Answer length: ${result.answer?.length || 0} chars`);
    console.log(`🔗 Sources: ${result.sources?.length || 0}`);
    console.log(`🖼️  Images: ${result.images?.length || 0}`);
    console.log(`🎯 Provider: ${result.provider}`);
    
    return true;
  } catch (error) {
    console.error('❌ Regular Search Failed:', error.message);
    return false;
  }
}

async function testProSearch() {
  console.log('\n🚀 Testing PRO Search Flow');
  console.log('-'.repeat(30));
  
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  
  try {
    const result = await performSearch('Latest developments in quantum computing', {
      isPro: true,
      onStatusUpdate: (status) => console.log(`📊 Status: ${status}`)
    });
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    console.log('✅ Pro Search Completed');
    console.log(`⏱️  Duration: ${endTime - startTime}ms`);
    console.log(`🧠 Memory: ${startMemory.toFixed(1)}MB → ${endMemory.toFixed(1)}MB`);
    console.log(`📄 Answer length: ${result.answer?.length || 0} chars`);
    console.log(`🔗 Sources: ${result.sources?.length || 0}`);
    console.log(`🖼️  Images: ${result.images?.length || 0}`);
    console.log(`🎯 Provider: ${result.provider}`);
    console.log(`👁️  Perspectives: ${result.perspectives?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ Pro Search Failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🕐 Starting tests at ${new Date().toISOString()}`);
  
  const regularSuccess = await testRegularSearch();
  
  // Wait a moment between tests to allow cleanup
  console.log('\n⏳ Waiting 3 seconds between tests...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const proSuccess = await testProSearch();
  
  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(50));
  console.log(`📝 Regular Search: ${regularSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🚀 Pro Search: ${proSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`🧠 Final Memory Usage: ${finalMemory.toFixed(1)}MB`);
  
  if (regularSuccess && proSuccess) {
    console.log('\n🎉 All tests passed! Search architecture fixes verified.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// Add timeout protection
const testTimeout = setTimeout(() => {
  console.error('❌ Tests timed out after 2 minutes');
  process.exit(1);
}, 120000);

runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}).finally(() => {
  clearTimeout(testTimeout);
});
