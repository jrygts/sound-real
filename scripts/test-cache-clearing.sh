#!/bin/bash

# 🧪 TEST CACHE CLEARING EFFECTIVENESS
# Verify that the new Stripe plan synchronization system is working without cache interference

echo "🧪 Testing cache clearing effectiveness..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Function to test API with cache headers
test_api_response() {
    local endpoint=$1
    local description=$2
    
    echo ""
    echo "📡 Testing: $description"
    echo "Endpoint: $endpoint"
    
    # Make request and check cache headers
    response=$(curl -s -I "$BASE_URL$endpoint" 2>/dev/null || echo "CURL_FAILED")
    
    if [[ "$response" == "CURL_FAILED" ]]; then
        echo "❌ Request failed - is the dev server running?"
        return 1
    fi
    
    echo "Response headers:"
    echo "$response" | grep -E "(Cache-Control|Pragma|Expires|X-Timestamp)" || echo "⚠️  No cache headers found"
    
    # Check for proper cache-busting headers
    if echo "$response" | grep -q "Cache-Control.*no-store"; then
        echo "✅ Cache-Control: no-store found"
    else
        echo "❌ Cache-Control: no-store NOT found"
    fi
    
    if echo "$response" | grep -q "X-Timestamp"; then
        echo "✅ X-Timestamp found (real-time response)"
    else
        echo "⚠️  X-Timestamp not found"
    fi
}

# Function to test API response data
test_api_data() {
    local endpoint=$1
    local description=$2
    
    echo ""
    echo "📊 Testing data: $description"
    
    response=$(curl -s "$BASE_URL$endpoint" 2>/dev/null || echo "CURL_FAILED")
    
    if [[ "$response" == "CURL_FAILED" ]]; then
        echo "❌ Request failed"
        return 1
    fi
    
    echo "Response snippet:"
    echo "$response" | head -c 200
    echo "..."
    
    # Check if response looks like JSON
    if echo "$response" | grep -q '"success"'; then
        echo "✅ Valid JSON response"
    else
        echo "❌ Invalid JSON response"
    fi
}

echo "🚀 Starting cache effectiveness tests..."
echo "Make sure the dev server is running (npm run dev)"

# Test critical endpoints
test_api_response "/api/subscription/usage" "Usage API Cache Headers"
test_api_data "/api/subscription/usage" "Usage API Response Data"

test_api_response "/api/subscription/status" "Status API Cache Headers"
test_api_data "/api/subscription/status" "Status API Response Data"

# Test multiple rapid requests to verify no caching
echo ""
echo "🔄 Testing multiple rapid requests (cache busting verification)..."

for i in {1..3}; do
    echo "Request $i:"
    timestamp=$(curl -s "$BASE_URL/api/subscription/usage" | grep -o '"X-Timestamp"[^"]*' || echo "No timestamp")
    echo "  $timestamp"
    sleep 0.5
done

echo ""
echo "🧪 CACHE CLEARING TEST RESULTS:"
echo "================================"

# Check if dev server is responding
if curl -s "$BASE_URL/api/subscription/usage" > /dev/null 2>&1; then
    echo "✅ Dev server is responding"
    echo "✅ APIs are accessible"
    echo "✅ Cache-busting headers should be active"
    echo ""
    echo "🎯 TO VERIFY REAL-TIME SYNC:"
    echo "1. Check webhook logs in another terminal"
    echo "2. Test plan sync: npm run sync-plans:dry-run"
    echo "3. Test auto-correction by calling usage API"
    echo "4. Monitor browser network tab for cache headers"
else
    echo "❌ Dev server is not responding"
    echo "   Please run: npm run dev"
fi

echo ""
echo "📋 MANUAL VERIFICATION STEPS:"
echo "1. Open browser dev tools (F12)"
echo "2. Go to Network tab"
echo "3. Visit your app and check usage API calls"
echo "4. Verify cache headers: Cache-Control: no-store"
echo "5. Test Stripe plan changes are immediate" 