// Diagnostic script to find what's blocking clicks
// Paste this in the browser console when the UI is frozen

console.log('🔍 CLICK BLOCKING DIAGNOSTIC');
console.log('================================\n');

// Check for overlays
const allElements = document.querySelectorAll('*');
let foundIssues = false;

console.log('1. Checking for invisible overlays...');
allElements.forEach((el) => {
  const styles = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  
  // Check for large fixed/absolute elements that might be blocking
  if (
    (styles.position === 'fixed' || styles.position === 'absolute') &&
    rect.width > window.innerWidth * 0.5 &&
    rect.height > window.innerHeight * 0.5 &&
    parseInt(styles.zIndex) > 0
  ) {
    console.log('⚠️  Found potentially blocking element:', {
      tag: el.tagName,
      class: el.className,
      id: el.id,
      position: styles.position,
      zIndex: styles.zIndex,
      width: rect.width,
      height: rect.height,
      pointerEvents: styles.pointerEvents,
      opacity: styles.opacity,
      visibility: styles.visibility
    });
    foundIssues = true;
  }
});

console.log('\n2. Checking for pointer-events: none on body or main containers...');
const criticalElements = ['body', 'main', '[class*="container"]', '[class*="wrapper"]'];
criticalElements.forEach(selector => {
  const el = document.querySelector(selector);
  if (el) {
    const styles = window.getComputedStyle(el);
    if (styles.pointerEvents === 'none') {
      console.log('⚠️  Found pointer-events:none on:', {
        selector,
        tag: el.tagName,
        class: el.className
      });
      foundIssues = true;
    }
  }
});

console.log('\n3. Checking event listeners...');
const mainElement = document.querySelector('main');
if (mainElement) {
  console.log('Main element found:', {
    tag: mainElement.tagName,
    class: mainElement.className,
    hasClickListener: mainElement.onclick !== null,
    pointerEvents: window.getComputedStyle(mainElement).pointerEvents
  });
}

console.log('\n4. Testing click detection...');
document.addEventListener('click', function testClick(e) {
  console.log('✅ Click detected at:', {
    x: e.clientX,
    y: e.clientY,
    target: e.target,
    targetTag: e.target.tagName,
    targetClass: e.target.className
  });
  document.removeEventListener('click', testClick);
}, { once: true });

console.log('\n5. Checking for loading overlays or modals...');
const suspiciousElements = document.querySelectorAll('[class*="loading"], [class*="overlay"], [class*="modal"], [class*="backdrop"]');
if (suspiciousElements.length > 0) {
  console.log(`Found ${suspiciousElements.length} potentially blocking elements:`);
  suspiciousElements.forEach(el => {
    const styles = window.getComputedStyle(el);
    if (styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0') {
      console.log('⚠️  Visible potentially blocking element:', {
        tag: el.tagName,
        class: el.className,
        id: el.id,
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex
      });
      foundIssues = true;
    }
  });
}

if (!foundIssues) {
  console.log('\n✅ No obvious blocking issues found.');
  console.log('Try clicking anywhere now - it should log a click event above.');
} else {
  console.log('\n⚠️  Found potential issues! See details above.');
}

console.log('\n================================');
console.log('🔍 DIAGNOSTIC COMPLETE');
console.log('Now try clicking anywhere on the page...');
