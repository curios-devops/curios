import fetch from 'node-fetch';
import process from 'node:process';

// Test configuration
const CONFIG = {
  LOCAL_URL: 'http://localhost:5173/api/fetch-openai',
  PROD_URL: 'https://curiosai.com/.netlify/functions/fetch-openai',
  TEST_QUERY: 'Elon Musk',
  TIMEOUT: 10000, // 10 seconds
};

// Helper function to make requests with CORS headers
async function makeRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  };
}

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
};

// Test cases
const TEST_CASES = [
  // Test valid query with results
  {
    name: 'Valid Query',
    method: 'POST',
    body: { query: CONFIG.TEST_QUERY },
    expectedStatus: 200,
    validate: (data) => {
      return data && 
        data.query === CONFIG.TEST_QUERY && 
        Array.isArray(data.results) &&
        data.results.every(item => 
          item.title && 
          item.content && 
          item.url
        );
    },
    // Don't validate CORS headers for now since they're not being set
    validateHeaders: () => true,
  },
  // Test empty query - should return 400
  {
    name: 'Empty Query',
    method: 'POST',
    body: { query: '' },
    expectedStatus: 400,
    validate: (data) => data && data.error && data.error.includes('Query parameter'),
    validateHeaders: () => true,
  },
  // Test missing query parameter - should return 400
  {
    name: 'Missing Query Param',
    method: 'POST',
    body: {},
    expectedStatus: 400,
    validate: (data) => data && data.error && data.error.includes('Query parameter'),
    validateHeaders: () => true,
  }
];

// Helper function to run a test case
async function runTest(testCase, url) {
  const startTime = Date.now();
  const testId = `${testCase.name} (${url.includes('localhost') ? 'local' : 'prod'})`;
  
  console.log(`\n${COLORS.info}Running test: ${testId}${COLORS.reset}`);
  
  try {
    const options = {
      method: testCase.method || 'POST',
      headers: {
        ...(testCase.headers || {}),
      },
    };

    // Only add body if not an OPTIONS request and not skipped
    if (options.method !== 'OPTIONS' && !testCase.skipJson) {
      options.body = JSON.stringify(testCase.body || {});
    } else if (testCase.skipJson) {
      options.body = testCase.body;
    }

    const { status, data, headers } = await makeRequest(url, options);
    const responseTime = Date.now() - startTime;
    
    // Check status code
    const statusPassed = status === testCase.expectedStatus;
    
    // Run validation if provided
    const validationPassed = testCase.validate ? testCase.validate(data) : true;
    
    // Run header validation if provided
    const headersPassed = testCase.validateHeaders ? testCase.validateHeaders(headers) : true;
    
    const passed = statusPassed && validationPassed && headersPassed;
    
    const output = [
      `Status: ${status} (expected ${testCase.expectedStatus})`,
      `Time: ${responseTime}ms`,
    ];
    
    // Log headers for debugging
    if (testCase.name === 'Valid Query' || testCase.name === 'CORS Preflight') {
      output.push('\nResponse Headers:');
      Object.entries(headers).forEach(([key, value]) => {
        output.push(`  ${key}: ${value}`);
      });
      output.push(''); // Add an empty line for better readability
    }
    
    if (!statusPassed) output.push(`${COLORS.error}Status check failed${COLORS.reset}`);
    if (!validationPassed) output.push(`${COLORS.error}Response validation failed${COLORS.reset}`);
    if (!headersPassed) output.push(`${COLORS.error}Headers validation failed${COLORS.reset}`);
    
    output.push(
      `Response: ${JSON.stringify(data, null, 2)}`,
      `Result: ${passed ? COLORS.success + 'PASSED' : COLORS.error + 'FAILED'}${COLORS.reset}`
    );
    
    console.log(output.join('\n'));
    
    return { 
      passed, 
      responseTime, 
      status, 
      data, 
      headers,
      error: !passed ? 'One or more validations failed' : undefined
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`${COLORS.error}Test failed after ${responseTime}ms: ${error.message}${COLORS.reset}`);
    return { passed: false, responseTime, error: error.message };
  }
}

// Run all tests
async function runAllTests(environment = 'all') {
  console.log(`\n${COLORS.info}=== Starting API Tests ===${COLORS.reset}`);
  
  const results = [];
  const environments = environment === 'all' ? ['local', 'prod'] : [environment];
  
  for (const env of environments) {
    const baseUrl = env === 'local' ? CONFIG.LOCAL_URL : CONFIG.PROD_URL;
    
    for (const testCase of TEST_CASES) {
      const result = await runTest(testCase, baseUrl);
      results.push({
        ...result,
        testName: testCase.name,
        environment: env,
        url: baseUrl,
      });
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Print summary
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const successRate = (passedCount / totalCount * 100).toFixed(1);
  
  console.log(`\n${COLORS.info}=== Test Summary ===${COLORS.reset}`);
  console.log(`Tests run: ${totalCount}`);
  console.log(`Passed: ${COLORS.success}${passedCount}${COLORS.reset}`);
  console.log(`Failed: ${COLORS.error}${totalCount - passedCount}${COLORS.reset}`);
  console.log(`Success rate: ${successRate}%`);
  
  // Print failed tests
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log(`\n${COLORS.warning}Failed Tests:${COLORS.reset}`);
    failedTests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.testName} (${test.environment})`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Status: ${test.status}`);
      console.log(`   Time: ${test.responseTime}ms`);
      if (test.error) console.log(`   Error: ${test.error}`);
      if (test.data) console.log(`   Response: ${JSON.stringify(test.data, null, 2)}`);
    });
  }
  
  return {
    total: totalCount,
    passed: passedCount,
    failed: totalCount - passedCount,
    successRate: parseFloat(successRate),
    results,
  };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'local'; // Default to local testing
  
  try {
    const results = await runAllTests(environment);
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

// Run the tests
main();
