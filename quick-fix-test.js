#!/usr/bin/env node

// Quick test script to fix subscription status issues
// Usage: node quick-fix-test.js

const http = require('http');

console.log('🚀 Quick Subscription Fix Test\n');

// Get user ID from command line or use the one from logs
const USER_ID = process.argv[2] || '3bdb2beb-622d-4c3e-a973-a99d34cc0928';

console.log(`Testing with user ID: ${USER_ID}\n`);

async function testManualWebhook() {
  console.log('🧪 Testing manual webhook activation...');
  
  const postData = JSON.stringify({
    eventType: "subscription.activated",
    userId: USER_ID,
    customerId: `cus_test_${Date.now()}`,
    subscriptionId: `sub_test_${Date.now()}`,
    priceId: "price_1RWIH9R2giDQL8gTtQ0SIOlM"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhook/stripe/test',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Manual webhook activation successful!');
          console.log('Response:', JSON.parse(data));
          console.log('\n🎉 Your subscription should now be active!');
          console.log('👉 Go to http://localhost:3000/billing to verify');
        } else {
          console.log('❌ Manual webhook failed');
          console.log('Status:', res.statusCode);
          console.log('Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Connection error:', e.message);
      console.log('💡 Make sure your server is running: npm run dev');
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function testSubscriptionStatus() {
  console.log('\n🔍 Testing subscription status API...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/subscription/status',
    method: 'GET'
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('⚠️ Authentication required (expected for API test)');
        } else if (res.statusCode === 200) {
          console.log('✅ Subscription status API working');
          console.log('Response:', JSON.parse(data));
        } else {
          console.log('⚠️ Unexpected status:', res.statusCode);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Connection error:', e.message);
      resolve();
    });

    req.end();
  });
}

async function testBillingPortal() {
  console.log('\n🏧 Testing billing portal API...');
  
  const postData = JSON.stringify({
    returnUrl: "http://localhost:3000/billing"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/stripe/create-portal',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('⚠️ Authentication required (expected for API test)');
        } else if (res.statusCode === 200) {
          console.log('✅ Billing portal API working');
        } else {
          console.log('⚠️ Portal status:', res.statusCode);
          console.log('Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Connection error:', e.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('📋 Running subscription system tests...\n');
  
  // Test 1: Manual webhook activation
  await testManualWebhook();
  
  // Test 2: Subscription status API
  await testSubscriptionStatus();
  
  // Test 3: Billing portal API
  await testBillingPortal();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Go to http://localhost:3000/billing');
  console.log('2. Check if it shows "Pro Subscription Active"');
  console.log('3. Try clicking "Manage Subscription" button');
  console.log('4. For real webhook testing, see WEBHOOK_LOCAL_SETUP.md');
  
  console.log('\n💡 Tips:');
  console.log('- If your user ID is different, run: node quick-fix-test.js YOUR_USER_ID');
  console.log('- Check your terminal logs for detailed debug info');
  console.log('- Use Stripe CLI for production-ready webhook testing');
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node quick-fix-test.js [USER_ID]
  
Examples:
  node quick-fix-test.js
  node quick-fix-test.js 3bdb2beb-622d-4c3e-a973-a99d34cc0928
  
This script tests your subscription system by:
1. Manually activating a subscription via test webhook
2. Testing the subscription status API
3. Testing the billing portal API

Make sure your server is running first: npm run dev`);
  process.exit(0);
}

runTests().catch(console.error); 