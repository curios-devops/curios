#!/bin/bash

# 🚀 CuriosAI LinkedIn Sharing Deployment & Test Script

echo "🔗 CuriosAI LinkedIn Sharing - Deploy & Test"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    print_warning "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Step 1: Build the project
print_status "Building project..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix any build errors before deploying."
    exit 1
fi

print_success "Build completed successfully!"

# Step 2: Deploy to Netlify
print_status "Deploying to Netlify..."
echo ""
echo "Choose deployment option:"
echo "1) Deploy with Netlify CLI (recommended)"
echo "2) I'll deploy manually via Git"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        print_status "Deploying with Netlify CLI..."
        
        # Check if already linked to Netlify
        if [ -f ".netlify/state.json" ]; then
            netlify deploy --prod
        else
            print_status "Linking to Netlify site..."
            netlify init
            netlify deploy --prod
        fi
        
        if [ $? -eq 0 ]; then
            SITE_URL=$(netlify status --json | grep -o '"ssl_url":"[^"]*' | cut -d'"' -f4)
            print_success "Deployment successful!"
            print_success "Site URL: $SITE_URL"
        else
            print_error "Deployment failed. Check Netlify CLI output above."
            exit 1
        fi
        ;;
    2)
        print_warning "Manual deployment selected."
        print_status "Please commit and push your changes:"
        echo "  git add ."
        echo "  git commit -m 'Fix LinkedIn sharing and modal theme'"
        echo "  git push origin main"
        echo ""
        read -p "Enter your deployed site URL (e.g., https://amazing-app.netlify.app): " SITE_URL
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Step 3: Test the deployment
if [ -n "$SITE_URL" ]; then
    print_status "Testing deployment..."
    
    echo ""
    echo "🧪 TESTING LINKEDIN IMPLEMENTATION"
    echo "=================================="
    
    # Test 1: Edge Function
    print_status "Testing edge function with social crawler..."
    EDGE_TEST=$(curl -s -H "User-Agent: LinkedInBot/1.0" "$SITE_URL/search?q=test" | head -10)
    
    if echo "$EDGE_TEST" | grep -q "og:title"; then
        print_success "✅ Edge function working - Social crawler detected"
    else
        print_warning "❌ Edge function may not be working - Check Netlify logs"
    fi
    
    # Test 2: OG Image Generation
    print_status "Testing OG image generation..."
    OG_RESPONSE=$(curl -s -w "%{http_code}" "$SITE_URL/.netlify/functions/og-image?query=test" -o /dev/null)
    
    if [ "$OG_RESPONSE" = "200" ]; then
        print_success "✅ OG image generation working"
    else
        print_warning "❌ OG image generation failed (HTTP $OG_RESPONSE)"
    fi
    
    # Test 3: Regular site
    print_status "Testing regular site..."
    SITE_RESPONSE=$(curl -s -w "%{http_code}" "$SITE_URL" -o /dev/null)
    
    if [ "$SITE_RESPONSE" = "200" ]; then
        print_success "✅ Main site working"
    else
        print_error "❌ Main site failed (HTTP $SITE_RESPONSE)"
    fi
    
    echo ""
    echo "🔗 LINKEDIN TESTING INSTRUCTIONS"
    echo "==============================="
    echo ""
    echo "1. 📋 Test URLs (copy these):"
    echo "   Search Page: $SITE_URL/search?q=artificial%20intelligence"
    echo "   OG Image: $SITE_URL/.netlify/functions/og-image?query=test"
    echo ""
    echo "2. 🧪 LinkedIn Post Inspector:"
    echo "   → Go to: https://www.linkedin.com/post-inspector/"
    echo "   → Enter: $SITE_URL/search?q=artificial%20intelligence"
    echo "   → Should show: Dynamic title, description, and image"
    echo ""
    echo "3. 📱 Test Sharing:"
    echo "   → Share the search URL on LinkedIn"
    echo "   → Should show query-specific preview"
    echo ""
    echo "4. 🔍 Debug if needed:"
    echo "   → Check Netlify Dashboard → Functions tab for logs"
    echo "   → Try different queries: $SITE_URL/search?q=space%20exploration"
    echo "   → Clear LinkedIn cache with Post Inspector"
    echo ""
    
    # Open useful URLs
    print_status "Opening useful debugging pages..."
    
    if command -v open &> /dev/null; then
        open "https://www.linkedin.com/post-inspector/"
        open "$SITE_URL/search?q=artificial%20intelligence"
        print_success "Opened LinkedIn Post Inspector and test page"
    else
        print_warning "Could not auto-open URLs. Please visit them manually."
    fi
    
else
    print_error "No site URL provided. Cannot run tests."
fi

echo ""
print_success "🎉 Deployment and testing script completed!"
print_status "Check the LinkedIn Post Inspector to verify dynamic previews are working."
echo ""
