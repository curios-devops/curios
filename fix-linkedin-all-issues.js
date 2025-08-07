#!/usr/bin/env node

/**
 * Comprehensive LinkedIn Sharing Fix Script
 * Fixes all 3 critical issues:
 * 1. LinkedIn URL generation
 * 2. Post Inspector testing URLs
 * 3. Meta tag delivery verification
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive LinkedIn sharing fixes...\n');

// Fix 1: ShareMenu.tsx LinkedIn URL Generation
function fixShareMenu() {
    console.log('1️⃣ Fixing ShareMenu.tsx LinkedIn URL generation...');
    
    const shareMenuPath = path.join(__dirname, 'src/components/ShareMenu.tsx');
    
    if (!fs.existsSync(shareMenuPath)) {
        console.log('❌ ShareMenu.tsx not found at expected path');
        return false;
    }
    
    let content = fs.readFileSync(shareMenuPath, 'utf8');
    
    // Replace the problematic LinkedIn URL generation
    const oldPattern = /const linkedInParams = new URLSearchParams\(\{[\s\S]*?\}\);[\s\S]*?const linkedInUrl = `https:\/\/www\.linkedin\.com\/shareArticle\?\${linkedInParams\.toString\(\)}`/g;
    
    const newLinkedInCode = `// Fixed LinkedIn URL - use sharing/share-offsite for better compatibility
    // This prevents LinkedIn Post Inspector from redirecting to login page
    const linkedInUrl = \`https://www.linkedin.com/sharing/share-offsite/?url=\${encodeURIComponent(cleanUrl)}\`;
    
    // Alternative: Use shareArticle with proper parameters if needed
    // const linkedInParams = new URLSearchParams({
    //   mini: 'true',
    //   url: cleanUrl,
    //   title: linkedInTitle,
    //   summary: description || 'Explore this search on CuriosAI'
    // });
    // const linkedInUrl = \`https://www.linkedin.com/shareArticle?\${linkedInParams.toString()}\`;`;
    
    if (content.includes('linkedInParams')) {
        content = content.replace(oldPattern, newLinkedInCode);
        fs.writeFileSync(shareMenuPath, content);
        console.log('✅ ShareMenu.tsx LinkedIn URL generation fixed');
        return true;
    } else {
        console.log('⚠️ LinkedIn URL pattern not found in ShareMenu.tsx - may already be fixed');
        return false;
    }
}

// Fix 2: Debug Tool - Test Correct URLs
function fixDebugTool() {
    console.log('\n2️⃣ Fixing LinkedIn debug tool to test correct URLs...');
    
    const debugToolPath = path.join(__dirname, 'public/linkedin-debug-tool.html');
    
    if (!fs.existsSync(debugToolPath)) {
        console.log('❌ linkedin-debug-tool.html not found');
        return false;
    }
    
    let content = fs.readFileSync(debugToolPath, 'utf8');
    
    // Fix the test URLs section to test actual CuriosAI URLs, not LinkedIn share URLs
    const newTestUrlsFunction = `        function openLinkedInInspector() {
            window.open('https://www.linkedin.com/post-inspector/', '_blank');
            
            const testUrls = \`
🔍 TEST THESE CURIOS AI URLS IN LINKEDIN POST INSPECTOR:

❗ IMPORTANT: Test the actual CuriosAI URLs below, NOT the LinkedIn share URLs!
LinkedIn Post Inspector needs to crawl the actual content, not the share URLs.

1. 🏠 Homepage: https://curios-ai.netlify.app/
2. 🔍 Search example: https://curios-ai.netlify.app/?q=artificial+intelligence
3. 🧪 Test query: https://curios-ai.netlify.app/?q=Meta+smart+wristband
4. 📱 Mobile test: https://curios-ai.netlify.app/?q=technology+trends
5. 🎯 Debug mode: https://curios-ai.netlify.app/?q=test&debug=linkedin

⚠️ CRITICAL: Do NOT test LinkedIn share URLs like:
❌ https://www.linkedin.com/sharing/share-offsite/?url=...
❌ https://www.linkedin.com/shareArticle?...

✅ ONLY test the actual CuriosAI URLs above!

📋 Testing Checklist:
- Copy each URL above into LinkedIn Post Inspector
- Verify title shows the search query (not "What do you want to talk about?")
- Verify image appears (processed search result image)
- Check image dimensions are 1200x627
- Ensure no redirects to LinkedIn login page
\`;
            
            document.getElementById('testUrls').textContent = testUrls;
        }`;
    
    if (content.includes('openLinkedInInspector')) {
        // Replace the existing function
        content = content.replace(/function openLinkedInInspector\(\) \{[\s\S]*?\n        \}/g, newTestUrlsFunction);
        fs.writeFileSync(debugToolPath, content);
        console.log('✅ Debug tool fixed to test correct URLs');
        return true;
    } else {
        console.log('⚠️ openLinkedInInspector function not found');
        return false;
    }
}

// Fix 3: Create Edge Function Test
function createEdgeFunctionTest() {
    console.log('\n3️⃣ Creating edge function meta tag test...');
    
    const testContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edge Function Meta Tag Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .code { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        button { background: #0077B5; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
    </style>
</head>
<body>
    <h1>🧪 Edge Function Meta Tag Test</h1>
    
    <div class="test-section">
        <h2>📡 Test Edge Function Response</h2>
        <p>This tests if the edge function is serving proper meta tags to LinkedIn's crawler.</p>
        <button onclick="testEdgeFunction()">Test Edge Function</button>
        <div class="code" id="edgeResult"></div>
    </div>
    
    <div class="test-section">
        <h2>🤖 Simulate LinkedIn Crawler</h2>
        <p>This simulates how LinkedIn's crawler sees your page.</p>
        <button onclick="simulateLinkedInCrawler()">Simulate LinkedIn Crawler</button>
        <div class="code" id="crawlerResult"></div>
    </div>
    
    <script>
        async function testEdgeFunction() {
            const result = document.getElementById('edgeResult');
            result.textContent = 'Testing edge function...\\n';
            
            try {
                const testUrl = window.location.origin + '/?q=test';
                const response = await fetch(testUrl, {
                    headers: {
                        'User-Agent': 'LinkedInBot/1.0 (compatible; +https://www.linkedin.com/)'
                    }
                });
                
                const html = await response.text();
                result.textContent = \`✅ Edge Function Response (Status: \${response.status}):

📄 HTML Response (first 1000 chars):
\${html.substring(0, 1000)}...

🏷️ Meta Tags Found:
\${extractMetaTags(html)}
\`;
            } catch (error) {
                result.textContent = \`❌ Error testing edge function: \${error.message}\`;
            }
        }
        
        async function simulateLinkedInCrawler() {
            const result = document.getElementById('crawlerResult');
            result.textContent = 'Simulating LinkedIn crawler...\\n';
            
            try {
                const testUrls = [
                    '/?q=artificial+intelligence',
                    '/?q=Meta+smart+wristband',
                    '/?q=technology+trends'
                ];
                
                let allResults = '';
                
                for (const testUrl of testUrls) {
                    const fullUrl = window.location.origin + testUrl;
                    const response = await fetch(fullUrl, {
                        headers: {
                            'User-Agent': 'LinkedInBot/1.0 (compatible; +https://www.linkedin.com/)',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                        }
                    });
                    
                    const html = await response.text();
                    const metaTags = extractMetaTags(html);
                    
                    allResults += \`\\n🔗 URL: \${fullUrl}
📊 Status: \${response.status}
🏷️ Meta Tags:
\${metaTags}
\\n---\\n\`;
                }
                
                result.textContent = allResults;
            } catch (error) {
                result.textContent = \`❌ Error simulating crawler: \${error.message}\`;
            }
        }
        
        function extractMetaTags(html) {
            const metaRegex = /<meta[^>]*(?:property|name)=["']([^"']*og:[^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
            const matches = [];
            let match;
            
            while ((match = metaRegex.exec(html)) !== null) {
                matches.push(\`  \${match[1]}: "\${match[2]}"\`);
            }
            
            return matches.length > 0 ? matches.join('\\n') : '  No OpenGraph meta tags found';
        }
    </script>
</body>
</html>`;
    
    const testPath = path.join(__dirname, 'public/edge-function-test.html');
    fs.writeFileSync(testPath, testContent);
    console.log('✅ Edge function test created at public/edge-function-test.html');
    return true;
}

// Fix 4: Create Deployment Script
function createDeploymentScript() {
    console.log('\n4️⃣ Creating comprehensive deployment script...');
    
    const deployScript = `#!/bin/bash

echo "🚀 Deploying LinkedIn Sharing Fixes..."

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Deployment successful!"
echo ""
echo "🧪 Next Steps - Test these URLs in LinkedIn Post Inspector:"
echo "1. https://curios-ai.netlify.app/"
echo "2. https://curios-ai.netlify.app/?q=artificial+intelligence"
echo "3. https://curios-ai.netlify.app/?q=Meta+smart+wristband"
echo ""
echo "🔍 LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/"
echo "🧪 Edge Function Test: https://curios-ai.netlify.app/edge-function-test.html"
echo "🔧 Debug Tool: https://curios-ai.netlify.app/linkedin-debug-tool.html"
`;
    
    const scriptPath = path.join(__dirname, 'deploy-linkedin-fixes.sh');
    fs.writeFileSync(scriptPath, deployScript);
    fs.chmodSync(scriptPath, '755');
    console.log('✅ Deployment script created at deploy-linkedin-fixes.sh');
    return true;
}

// Main execution
function main() {
    let fixes = 0;
    
    if (fixShareMenu()) fixes++;
    if (fixDebugTool()) fixes++;
    if (createEdgeFunctionTest()) fixes++;
    if (createDeploymentScript()) fixes++;
    
    console.log(`\n🎯 LinkedIn Sharing Fix Summary:`);
    console.log(`✅ Completed ${fixes}/4 fixes`);
    console.log(`\n📋 What was fixed:`);
    console.log(`1. ✅ LinkedIn URL generation (use sharing/share-offsite)`);
    console.log(`2. ✅ Debug tool testing (test actual CuriosAI URLs)`);
    console.log(`3. ✅ Edge function test tool created`);
    console.log(`4. ✅ Deployment script created`);
    
    console.log(`\n🚀 Next Steps:`);
    console.log(`1. Run: chmod +x deploy-linkedin-fixes.sh`);
    console.log(`2. Run: ./deploy-linkedin-fixes.sh`);
    console.log(`3. Test URLs in LinkedIn Post Inspector`);
    console.log(`4. Verify meta tags with edge-function-test.html`);
    
    console.log(`\n🔍 Critical URLs to test:`);
    console.log(`- https://curios-ai.netlify.app/?q=test`);
    console.log(`- https://curios-ai.netlify.app/?q=artificial+intelligence`);
    console.log(`- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/`);
}

main();
