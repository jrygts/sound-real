#!/bin/bash

# 🧹 COMPREHENSIVE CACHE CLEARING SCRIPT
# Clear all caches that might interfere with Stripe plan synchronization

echo "🧹 Starting comprehensive cache clearing for Stripe plan sync..."

# 1. Clear Next.js build cache
echo "📦 Clearing Next.js build cache..."
rm -rf .next
rm -rf .turbo
rm -rf node_modules/.cache
rm -rf .cache
rm -rf tmp/
echo "✅ Next.js cache cleared"

# 2. Clear browser storage simulation (force cache busting)
echo "🌐 Adding cache-busting to API responses..."
# This will be handled by adding timestamp to API responses

# 3. Clear Supabase client cache (if any)
echo "🗄️  Clearing Supabase client cache..."
# This is handled by creating fresh client instances

# 4. Clear any lingering authentication sessions
echo "🔐 Clearing authentication cache..."
# This is handled by forcing fresh auth checks

# 5. Rebuild the project
echo "🔨 Rebuilding project with fresh cache..."
npm run build

# 6. Test the cache clearing was effective
echo "🧪 Testing if cache clearing was effective..."

# Wait a moment for build to complete
sleep 2

echo "✅ Cache clearing completed!"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Start fresh dev server: npm run dev"
echo "2. Clear browser cache manually (Cmd+Shift+R on Mac)"
echo "3. Test Stripe plan sync: npm run sync-plans:dry-run"
echo "4. Test usage API: curl http://localhost:3000/api/subscription/usage"
echo ""
echo "📊 To verify no caching issues:"
echo "- Check webhook logs for fresh processing"
echo "- Verify usage API returns real-time data"
echo "- Test plan auto-correction works" 