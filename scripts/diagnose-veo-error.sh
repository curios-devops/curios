#!/bin/bash
# Diagnose VEO 500 Error

echo "🔍 VEO Error Diagnostic Tool"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Supabase CLI
echo "1️⃣  Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI installed${NC}"
else
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    exit 1
fi

# Check 2: Secrets
echo ""
echo "2️⃣  Checking secrets..."
SECRETS=$(supabase secrets list 2>&1)

if echo "$SECRETS" | grep -q "VERTEX_AI_SERVICE_ACCOUNT_EMAIL"; then
    echo -e "${GREEN}✅ VERTEX_AI_SERVICE_ACCOUNT_EMAIL is set${NC}"
    EMAIL_SET=true
else
    echo -e "${RED}❌ VERTEX_AI_SERVICE_ACCOUNT_EMAIL is NOT set${NC}"
    EMAIL_SET=false
fi

if echo "$SECRETS" | grep -q "VERTEX_AI_PRIVATE_KEY"; then
    echo -e "${GREEN}✅ VERTEX_AI_PRIVATE_KEY is set${NC}"
    KEY_SET=true
else
    echo -e "${RED}❌ VERTEX_AI_PRIVATE_KEY is NOT set${NC}"
    KEY_SET=false
fi

if [ "$EMAIL_SET" = false ] || [ "$KEY_SET" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Missing secrets. Please set them:${NC}"
    echo "   supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL='your-email@project.iam.gserviceaccount.com'"
    echo "   supabase secrets set VERTEX_AI_PRIVATE_KEY='your-private-key'"
    exit 1
fi

# Check 3: Google Cloud CLI
echo ""
echo "3️⃣  Checking Google Cloud setup..."
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✅ gcloud CLI installed${NC}"

    # Check if Vertex AI API is enabled
    echo "   Checking if Vertex AI API is enabled..."
    if gcloud services list --enabled --project=curios-vertex 2>/dev/null | grep -q aiplatform; then
        echo -e "${GREEN}   ✅ Vertex AI API is enabled${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Vertex AI API might not be enabled${NC}"
        echo "   Run: gcloud services enable aiplatform.googleapis.com --project=curios-vertex"
    fi
else
    echo -e "${YELLOW}⚠️  gcloud CLI not installed (optional but helpful)${NC}"
fi

# Check 4: Recent function logs
echo ""
echo "4️⃣  Checking recent function logs..."
echo "   Last 5 log entries:"
echo "   -------------------"
supabase functions logs veo-generate-video --tail 5 2>&1 | tail -20

# Check 5: Test the function
echo ""
echo "5️⃣  Testing the function..."
read -p "Do you want to test the function now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Get Supabase URL and anon key
    echo "   Please provide your Supabase anon key:"
    read -s ANON_KEY
    echo ""

    SUPABASE_URL="https://gpfccicfqynahflehpqo.supabase.co"

    echo "   Sending test request..."
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/veo-generate-video" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"action":"generate","prompt":"test sunset","aspectRatio":"16:9"}')

    echo "   Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}   ✅ Function is working!${NC}"
    else
        echo -e "${RED}   ❌ Function returned an error${NC}"
        echo ""
        echo "   Error details:"
        echo "$RESPONSE" | jq '.error' 2>/dev/null || echo "$RESPONSE"
    fi
fi

echo ""
echo "=============================="
echo "Diagnostic complete!"
echo ""
echo "📚 For more help, see:"
echo "   docs/Studio/fixes/VEO_500_ERROR_FIX.md"
echo "   DEBUG_VEO_500.md"
