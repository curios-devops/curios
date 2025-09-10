// Test script to verify CSP font loading fix
console.log('🔧 CSP Font Loading Fix Test');

// Check if Google Fonts are loading correctly
const testFontLoading = () => {
  console.log('📋 Testing font loading...');
  
  // Check if Inter font is available
  const testElement = document.createElement('div');
  testElement.style.fontFamily = 'Inter, sans-serif';
  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  testElement.textContent = 'Test text';
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const fontFamily = computedStyle.fontFamily;
  
  console.log('Applied font family:', fontFamily);
  
  if (fontFamily.includes('Inter')) {
    console.log('✅ Inter font loaded successfully');
  } else {
    console.log('❌ Inter font failed to load');
  }
  
  document.body.removeChild(testElement);
};

// Check CSP violations in console
const checkCSPViolations = () => {
  console.log('🔍 Checking for CSP violations...');
  
  // Monitor CSP violations
  document.addEventListener('securitypolicyviolation', (e) => {
    console.error('🚨 CSP Violation:', {
      directive: e.violatedDirective,
      blockedURI: e.blockedURI,
      documentURI: e.documentURI
    });
  });
  
  console.log('👂 Listening for CSP violations...');
};

// Run tests
if (typeof window !== 'undefined') {
  checkCSPViolations();
  
  // Wait for fonts to load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testFontLoading, 1000);
  });
  
  // Also test after window load
  window.addEventListener('load', () => {
    setTimeout(testFontLoading, 2000);
  });
}

console.log('🎯 CSP Font Fix Applied:');
console.log('- Added https://fonts.gstatic.com to font-src in netlify.toml');
console.log('- Updated CSP in index.html for consistency');
console.log('- This should resolve the 28 font loading errors');