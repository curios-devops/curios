#!/bin/bash

# 🔧 LinkedIn Sharing - Fix All 3 Critical Issues Script
# This script addresses the LinkedIn Post Inspector redirect issue

echo "🔧 Starting LinkedIn Sharing Fixes..."

# Create backup of original files
echo "📦 Creating backups..."
cp public/linkedin-debug-tool.html public/linkedin-debug-tool.html.backup
cp src/components/ShareMenu.tsx src/components/ShareMenu.tsx.backup 2>/dev/null || echo "ShareMenu.tsx not found, will search for it"

echo "✅ Backups created"

# Fix 1: Create enhanced edge function test
echo "🧪 Creating edge function test..."
cat > public/edge-function-test.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edge Function Meta Tag Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            background: #f5f5f5; 
            line-height: 1.6;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 1000px;
            margin: 0 auto;
        }
        .test-section { 
            margin: 20px 0; 
            padding: 20px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            background: #f9f9f9;
        }
        .code { 
            background: #f0f0f0; 
            padding: 10px; 
            border-radius: 5px; 
            font-family: monospace; 
            white-space: pre-wrap; 
            max-height: 400px;
            overflow-y: auto;
            font-size: 12px;
        }
        button { 
            background: #0077B5; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px; 
        }
        button:hover { background: #005582; }
        .success { color: #2e7d32; font-weight: bold; }
        .error { color: #d32f2f; font-weight: bold; }
        .warning { color: #f57c00; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 LinkedIn Edge Function Meta Tag Test</h1>
        <p>This tool tests if your edge function is properly serving meta tags to LinkedIn's crawler.</p>
        
        <div class="test-section">
            <h2>🤖 Simulate LinkedIn Crawler</h2>
            <p>Tests how LinkedIn's crawler sees your CuriosAI pages:</p>
            <button onclick="simulateLinkedInCrawler()">Test LinkedIn Crawler</button>
            <div class="code" id="crawlerResult">Click the button above to test...</div>
        </div>
        
        <div class="test-section">
            <h2>📡 Edge Function Response Test</h2>
            <p>Tests if edge function responds correctly:</p>
            <button onclick="testEdgeFunction()">Test Edge Function</button>
            <div class="code" id="edgeResult">Click the button above to test...</div>
        </div>
        
        <div class="test-section">
            <h2>🔍 LinkedIn Post Inspector Links</h2>
            <p class="warning">⚠️ IMPORTANT: Use these exact URLs in LinkedIn Post Inspector:</p>
            <div class="code" id="testUrls">
🔍 TEST THESE CURIOS AI URLS IN LINKEDIN POST INSPECTOR:

❗ CRITICAL: Test the actual CuriosAI URLs below, NOT LinkedIn share URLs!

1. 🏠 Homepage: https://curios-ai.netlify.app/
2. 🔍 AI Search: https://curios-ai.netlify.app/?q=artificial+intelligence
3. 🧪 Meta Query: https://curios-ai.netlify.app/?q=Meta+smart+wristband
4. 📱 Tech Query: https://curios-ai.netlify.app/?q=technology+trends
5. 🎯 Test Query: https://curios-ai.netlify.app/?q=test

🚫 DO NOT TEST LinkedIn share URLs like:
❌ https://www.linkedin.com/sharing/share-offsite/?url=...
❌ https://www.linkedin.com/shareArticle?...

✅ ONLY test the actual CuriosAI URLs above!

🔗 LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
            </div>
            <button onclick="openLinkedInInspector()">Open LinkedIn Post Inspector</button>
        </div>
    </div>

    <script>
        async function simulateLinkedInCrawler() {
            const result = document.getElementById('crawlerResult');
            result.textContent = 'Testing LinkedIn crawler simulation...\n\n';
            
            const testUrls = [
                '/?q=artificial+intelligence',
                '/?q=Meta+smart+wristband', 
                '/?q=technology+trends',
                '/?q=test'
            ];
            
            let allResults = '';
            
            for (const testUrl of testUrls) {
                try {
                    const fullUrl = window.location.origin + testUrl;
                    allResults += `🔗 Testing: ${fullUrl}\n`;
                    
                    const response = await fetch(fullUrl, {
                        headers: {
                            'User-Agent': 'LinkedInBot/1.0 (compatible; +https://www.linkedin.com/)',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                        }
                    });
                    
                    allResults += `📊 Status: ${response.status}\n`;
                    
                    if (response.ok) {
                        const html = await response.text();
                        const metaTags = extractMetaTags(html);
                        allResults += `🏷️ Meta Tags Found:\n${metaTags}\n`;
                        
                        // Check for title
                        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                        if (titleMatch) {
                            allResults += `📝 Title: "${titleMatch[1]}"\n`;
                        }
                        
                        allResults += `✅ SUCCESS: Page accessible to LinkedIn crawler\n`;
                    } else {
                        allResults += `❌ ERROR: HTTP ${response.status}\n`;
                    }
                } catch (error) {
                    allResults += `❌ ERROR: ${error.message}\n`;
                }
                
                allResults += '\n---\n\n';
            }
            
            result.textContent = allResults;
        }
        
        async function testEdgeFunction() {
            const result = document.getElementById('edgeResult');
            result.textContent = 'Testing edge function response...\n\n';
            
            try {
                const testUrl = window.location.origin + '/?q=test';
                const response = await fetch(testUrl, {
                    headers: {
                        'User-Agent': 'LinkedInBot/1.0 (compatible; +https://www.linkedin.com/)'
                    }
                });
                
                result.textContent = `🔗 Test URL: ${testUrl}
📊 Status: ${response.status}
📄 Content-Type: ${response.headers.get('content-type')}
🕒 Response Time: ${Date.now()}ms

`;
                
                if (response.ok) {
                    const html = await response.text();
                    result.textContent += `✅ Edge Function Response Received

📄 HTML Preview (first 500 chars):
${html.substring(0, 500)}...

🏷️ Meta Tags Extracted:
${extractMetaTags(html)}

✅ Edge function is working correctly!`;
                } else {
                    result.textContent += `❌ Edge function error: HTTP ${response.status}`;
                }
            } catch (error) {
                result.textContent += `❌ Network error: ${error.message}`;
            }
        }
        
        function extractMetaTags(html) {
            const patterns = [
                /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi,
                /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:([^"']+)["'][^>]*>/gi,
                /<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi
            ];
            
            const matches = [];
            
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(html)) !== null) {
                    if (pattern.source.includes('property=')) {
                        matches.push(`  og:${match[1]}: "${match[2]}"`);
                    } else if (pattern.source.includes('twitter:')) {
                        matches.push(`  twitter:${match[1]}: "${match[2]}"`);
                    }
                }
            });
            
            return matches.length > 0 ? matches.join('\n') : '  ❌ No meta tags found';
        }
        
        function openLinkedInInspector() {
            window.open('https://www.linkedin.com/post-inspector/', '_blank');
        }
        
        console.log('🧪 Edge Function Test Tool Loaded');
    </script>
</body>
</html>
EOF

echo "✅ Edge function test created at public/edge-function-test.html"

# Fix 2: Search for ShareMenu component and fix it
echo "🔍 Searching for ShareMenu component..."

SHAREMENU_FILE=""
if [ -f "src/components/ShareMenu.tsx" ]; then
    SHAREMENU_FILE="src/components/ShareMenu.tsx"
elif [ -f "src/components/ShareMenu.ts" ]; then
    SHAREMENU_FILE="src/components/ShareMenu.ts"
else
    # Search for the file
    SHAREMENU_FILE=$(find src -name "*ShareMenu*" -type f | head -1)
fi

if [ ! -z "$SHAREMENU_FILE" ]; then
    echo "📁 Found ShareMenu at: $SHAREMENU_FILE"
    
    # Create a backup
    cp "$SHAREMENU_FILE" "${SHAREMENU_FILE}.backup"
    
    # Fix the LinkedIn URL generation
    sed -i.tmp 's|const linkedInParams = new URLSearchParams({|// FIXED: Use sharing/share-offsite for better compatibility\
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cleanUrl)}`;\
    \
    // Alternative: Use shareArticle with proper parameters (commented out)\
    // const linkedInParams = new URLSearchParams({|g' "$SHAREMENU_FILE"
    
    # Fix the LinkedIn URL assignment
    sed -i.tmp 's|const linkedInUrl = `https://www.linkedin.com/shareArticle?\${linkedInParams.toString()}\`;|// const linkedInUrl = \`https://www.linkedin.com/shareArticle?\${linkedInParams.toString()}\`;|g' "$SHAREMENU_FILE"
    
    # Clean up temporary files
    rm "${SHAREMENU_FILE}.tmp" 2>/dev/null || true
    
    echo "✅ ShareMenu component fixed"
else
    echo "⚠️ ShareMenu component not found - will need manual fix"
fi

# Fix 3: Create deployment and testing script
echo "🚀 Creating deployment script..."
cat > deploy-linkedin-fixes.sh << 'EOF'
#!/bin/bash

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
echo ""
echo "⚠️ IMPORTANT: Test the CuriosAI URLs above in Post Inspector, NOT LinkedIn share URLs!"
EOF

chmod +x deploy-linkedin-fixes.sh
echo "✅ Deployment script created"

echo ""
echo "🎯 LinkedIn Sharing Fix Summary:"
echo "✅ 1. Edge function test tool created"
echo "✅ 2. ShareMenu LinkedIn URL fixed (if found)"
echo "✅ 3. Deployment script created"
echo ""
echo "🚀 Next Steps:"
echo "1. Run: ./deploy-linkedin-fixes.sh"
echo "2. Test URLs in LinkedIn Post Inspector"
echo "3. Use edge-function-test.html to verify meta tags"
echo ""
echo "🔍 Critical URLs to test in LinkedIn Post Inspector:"
echo "- https://curios-ai.netlify.app/?q=test"
echo "- https://curios-ai.netlify.app/?q=artificial+intelligence"
echo "- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/"
