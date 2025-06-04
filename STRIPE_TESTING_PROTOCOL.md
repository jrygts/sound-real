# 🚀 STRIPE INTEGRATION TESTING PROTOCOL

## CRITICAL: Run This Immediately Before TikTok Launch

### **STEP 1: Fix Database (5 minutes)**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click "SQL Editor"

2. **Run Complete Database Setup**
   - Copy entire contents of `lib/supabase/setup-complete-database.sql`
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Should see "SUCCESS" messages

3. **Verify Tables Created**
   - Go to "Table Editor"
   - Confirm you see: `profiles`, `transformations`, `usage_tracking`
   - ✅ All 3 tables should exist

### **STEP 2: Debug Check (2 minutes)**

1. **Visit Debug Endpoint**
   - Go to: `http://localhost:3001/api/stripe/debug`
   - Check the JSON response

2. **Expected Results:**
   ```json
   {
     "diagnostics": {
       "tableChecks": {
         "profiles": "EXISTS",
         "transformations": "EXISTS", 
         "usage_tracking": "EXISTS"
       },
       "stripeApiKey": "OK",
       "userAuth": "OK" or "FAIL",
       "summary": {
         "critical_issues": [],
         "recommendations": []
       }
     }
   }
   ```

3. **If Critical Issues Found:**
   - Follow the recommendations in the response
   - Re-run debug check until `critical_issues: []`

### **STEP 3: Authentication Test (3 minutes)**

1. **Sign In/Up**
   - Go to `/signin`
   - Sign in with your account
   - ✅ Should redirect to `/dashboard`

2. **Check Profile Creation**
   - Visit: `http://localhost:3001/api/stripe/debug`
   - Look for `"userProfile"` in response
   - ✅ Should NOT be `"PROFILES_TABLE_MISSING"`

3. **Manual Profile Creation (if needed)**
   - POST to: `http://localhost:3001/api/stripe/create-profile`
   - ✅ Should return `{"success": true}`

### **STEP 4: Stripe Checkout Test (5 minutes)**

1. **Go to Pricing Page**
   - Navigate to `/pricing` 
   - Choose any plan
   - Click "Subscribe Now"

2. **Expected Flow:**
   - ✅ Should redirect to Stripe Checkout
   - ✅ NOT see error alert below button
   - ✅ NOT get 404 or error page

3. **Complete Test Payment**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - ✅ Should complete successfully

4. **Verify Success Flow**
   - ✅ Should redirect to `/success` page
   - ✅ Should see "Payment Successful!" message
   - ✅ Should have "Go to Dashboard" link

### **STEP 5: Cancel Flow Test (2 minutes)**

1. **Start Another Checkout**
   - Go back to pricing
   - Click "Subscribe Now"
   - ✅ Should reach Stripe Checkout

2. **Cancel Payment**
   - Click browser back button or cancel in Stripe
   - ✅ Should redirect to `/cancel` page
   - ✅ Should see "Payment Cancelled" message

### **STEP 6: Webhook Verification (3 minutes)**

1. **Check Server Logs**
   - Look at your terminal running the dev server
   - ✅ Should see webhook events being processed
   - ✅ Should see profile updates in logs

2. **Start Stripe CLI (for local testing)**
   ```bash
   stripe listen --forward-to localhost:3001/api/webhook/stripe
   ```
   - ✅ Should connect successfully
   - ✅ Should see webhook events forwarded

### **STEP 7: Full End-to-End Test (10 minutes)**

1. **Fresh User Test**
   - Sign out completely
   - Create new account with different email
   - ✅ Profile should be created automatically

2. **Complete Payment Flow**
   - Sign in → Pricing → Subscribe → Complete Payment
   - ✅ Should reach success page
   - ✅ Should see subscription in Stripe dashboard

3. **Access Verification**
   - Check if user has access to paid features
   - ✅ Subscription should be active

### **STEP 8: Production Readiness Check (5 minutes)**

1. **Environment Variables**
   - ✅ All Stripe keys in `.env.local`
   - ✅ All Supabase keys configured
   - ✅ No secrets committed to git

2. **Error Handling**
   - Test with invalid card (4000 0000 0000 0002)
   - ✅ Should show appropriate error messages
   - ✅ Should handle failures gracefully

3. **Performance Check**
   - ✅ Checkout loads quickly
   - ✅ No console errors in browser
   - ✅ No 500 errors in server logs

## 🚨 TROUBLESHOOTING

### If Debug Shows "PROFILES_TABLE_MISSING":
```sql
-- Run this in Supabase SQL Editor:
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  customer_id TEXT,
  has_access BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
```

### If Checkout Still Fails:
1. Check server logs for exact error
2. Visit `/api/stripe/debug` for diagnostics
3. Ensure user is authenticated
4. Verify price IDs match Stripe dashboard

### If Webhooks Don't Work:
1. Start Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhook/stripe`
2. Use the webhook secret from CLI in your `.env.local`
3. Restart your dev server

## ✅ SUCCESS CRITERIA

**READY FOR TIKTOK LAUNCH WHEN:**
- [ ] All debug checks pass
- [ ] Stripe checkout redirects to Stripe (not 404)
- [ ] Test payment completes successfully  
- [ ] Success page loads correctly
- [ ] Cancel page loads correctly
- [ ] Webhooks process correctly
- [ ] No critical errors in logs
- [ ] New users can sign up and pay

## 🎯 EXPECTED TIMELINE

- **Database Fix**: 5 minutes
- **Testing**: 15 minutes  
- **Troubleshooting**: 10 minutes (max)
- **Total**: 30 minutes to launch-ready

**After this protocol passes, your Stripe integration is production-ready for TikTok marketing!** 🚀 