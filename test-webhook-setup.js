// Quick test script to verify webhook and database setup
// Run with: node test-webhook-setup.js

const https = require('https');
const http = require('http');

console.log('🧪 Testing Webhook and Database Setup...\n');

// Test 1: Check if webhook endpoint responds
function testWebhookEndpoint() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ test: true });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhook/stripe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 400) {
          console.log('✅ Webhook endpoint responds (missing signature error expected)');
        } else {
          console.log('⚠️ Webhook endpoint responds with status:', res.statusCode);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Webhook endpoint not reachable:', e.message);
      console.log('   Make sure your server is running with: npm run dev');
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// Test 2: Check subscription status API
function testSubscriptionStatusAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/subscription/status',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('✅ Subscription status API responds (authentication required)');
        } else {
          console.log('⚠️ Subscription status API responds with status:', res.statusCode);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Subscription status API not reachable:', e.message);
      resolve();
    });

    req.end();
  });
}

// Test 3: Check usage API
function testUsageAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/subscription/usage',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('✅ Usage API responds (authentication required)');
        } else {
          console.log('⚠️ Usage API responds with status:', res.statusCode);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Usage API not reachable:', e.message);
      resolve();
    });

    req.end();
  });
}

// Test 4: Check environment variables
function testEnvironmentVariables() {
  console.log('\n🔧 Environment Variables Check:');
  
  // Check if .env.local exists
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    console.log('✅ .env.local file exists');
    
    const hasWebhookSecret = envContent.includes('STRIPE_WEBHOOK_SECRET');
    const hasStripeSecret = envContent.includes('STRIPE_SECRET_KEY');
    const hasSupabaseKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log(hasWebhookSecret ? '✅ STRIPE_WEBHOOK_SECRET found' : '❌ STRIPE_WEBHOOK_SECRET missing');
    console.log(hasStripeSecret ? '✅ STRIPE_SECRET_KEY found' : '❌ STRIPE_SECRET_KEY missing');
    console.log(hasSupabaseKey ? '✅ SUPABASE_SERVICE_ROLE_KEY found' : '❌ SUPABASE_SERVICE_ROLE_KEY missing');
    
  } else {
    console.log('❌ .env.local file not found');
  }
}

// Run all tests
async function runTests() {
  console.log('1. Testing webhook endpoint...');
  await testWebhookEndpoint();
  
  console.log('\n2. Testing subscription status API...');
  await testSubscriptionStatusAPI();
  
  console.log('\n3. Testing usage API...');
  await testUsageAPI();
  
  testEnvironmentVariables();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run database migration in Supabase SQL Editor');
  console.log('2. Configure webhook in Stripe Dashboard');
  console.log('3. Test payment flow and check server logs');
  console.log('4. Verify /billing page shows correct status after payment');
  
  console.log('\n🔗 See WEBHOOK_DEBUGGING_GUIDE.md for detailed instructions');
}

runTests().catch(console.error); 