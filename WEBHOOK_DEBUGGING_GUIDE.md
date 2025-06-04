# 🚨 WEBHOOK DEBUGGING GUIDE - Fix Subscription Status Syncing

## 🎯 **CRITICAL ISSUE DIAGNOSIS**

Your payments work but subscription status isn't syncing. Let's debug step by step:

## **STEP 1: Run Database Migration (CRITICAL)**

**⚠️ URGENT**: Your `user_usage` table doesn't exist yet. Run this immediately:

### **1.1 Go to Supabase SQL Editor**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy the entire contents of `scripts/create-usage-table.sql`
4. Paste and run it

### **1.2 Verify Migration Success**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_usage', 'profiles');

-- Check profiles table columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%stripe%';
```

**Expected Results**:
- `user_usage` table exists
- `profiles` has: `stripe_customer_id`, `stripe_subscription_status`, `stripe_subscription_id`

---

## **STEP 2: Configure Stripe Webhook (CRITICAL)**

### **2.1 Check Current Webhook Setup**
Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

**Check if you have a webhook configured for**: `https://yourdomain.com/api/webhook/stripe`

### **2.2 Create/Update Webhook**

**If no webhook exists, create one:**

1. Click "Add endpoint"
2. **Endpoint URL**: `https://yourdomain.com/api/webhook/stripe`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### **2.3 Get Webhook Secret**
1. Click on your webhook endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. **Add to your `.env.local`**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### **2.4 Restart Your Development Server**
```bash
npm run dev
```

---

## **STEP 3: Test Webhook Configuration**

### **3.1 Check Environment Variables**
Look for this in your server logs when you restart:
```
🔗 [Webhook] Environment check: {
  hasWebhookSecret: true,
  hasSignature: true,
  bodyLength: 1234
}
```

**If `hasWebhookSecret: false`**: Your webhook secret isn't configured correctly.

### **3.2 Test Payment Flow with Debugging**

1. **Go to** `/pricing`
2. **Click** "Get Plus" (or any plan)
3. **Use test card**: `4242 4242 4242 4242`
4. **Complete payment**

### **3.3 Watch Server Logs**

**After payment, you should see:**
```
🔗 [Webhook] Received webhook request
🔗 [Webhook] 📨 Processing event: checkout.session.completed
🔗 [Webhook] 💳 Processing checkout.session.completed
🔗 [Webhook] ✅ Successfully activated subscription for user {id}
```

**If you see nothing**: Webhook isn't configured or not reaching your server.

---

## **STEP 4: Debugging Common Issues**

### **4.1 No Webhook Logs Appearing**

**Problem**: Webhook not configured or not reaching server

**Solutions**:
```bash
# Check if webhook endpoint responds
curl -X POST http://localhost:3000/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return error about missing signature (this is expected)
```

**For production**: Make sure your domain is publicly accessible and webhook URL is correct.

### **4.2 Webhook Receiving But Not Processing**

**Look for these error patterns**:

```
🔗 [Webhook] ❌ STRIPE_WEBHOOK_SECRET not configured
```
**Fix**: Add `STRIPE_WEBHOOK_SECRET` to `.env.local`

```
🔗 [Webhook] ❌ Signature verification failed
```
**Fix**: Wrong webhook secret or testing with curl (use Stripe CLI instead)

```
🔗 [Webhook] ❌ No client_reference_id (user ID) found
```
**Fix**: User not logged in during checkout - check auth flow

### **4.3 Database Update Failures**

```
🔗 [Webhook] ❌ Profile not found for user {id}
🔗 [Webhook] ❌ Failed to update profile
```

**Debug with SQL**:
```sql
-- Check if user profile exists
SELECT id, email, stripe_customer_id, stripe_subscription_status 
FROM profiles 
WHERE id = 'your-user-id';

-- Check auth.users table
SELECT id, email FROM auth.users WHERE id = 'your-user-id';
```

---

## **STEP 5: Real-Time Testing Protocol**

### **5.1 Complete End-to-End Test**

**Before Payment**:
1. Check `/billing` - should show "Free Plan"
2. Check database:
   ```sql
   SELECT stripe_subscription_status, has_access 
   FROM profiles WHERE id = 'your-user-id';
   ```
   Should be: `NULL` or `false`

**During Payment**:
1. Watch server logs for webhook events
2. Complete Stripe checkout

**After Payment**:
1. Check `/billing` - should show "Pro Subscription Active"
2. Check database:
   ```sql
   SELECT stripe_subscription_status, has_access, stripe_customer_id
   FROM profiles WHERE id = 'your-user-id';
   ```
   Should be: `active`, `true`, `cus_xxxxx`

### **5.2 Test Subscription Status API**

```bash
# Test status endpoint
curl http://localhost:3000/api/subscription/status

# Expected after payment:
{
  "success": true,
  "hasActiveSubscription": true,
  "subscriptionStatus": "active",
  "customerId": "cus_...",
  "isAdmin": false
}
```

### **5.3 Test Usage Tracking**

```bash
# Test usage endpoint
curl http://localhost:3000/api/subscription/usage

# Expected for paid user:
{
  "success": true,
  "usage": {
    "totalUsed": 0,
    "limit": 600,
    "remaining": 600,
    "plan": "Plus",
    "hasAccess": true
  }
}
```

---

## **STEP 6: Stripe CLI Testing (Advanced)**

### **6.1 Install Stripe CLI**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login
```

### **6.2 Forward Webhooks to Local Development**
```bash
# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhook/stripe

# This will show you the webhook secret to use
```

### **6.3 Trigger Test Events**
```bash
# Trigger a test subscription created event
stripe trigger checkout.session.completed
```

---

## **STEP 7: Production Webhook Setup**

### **7.1 Deploy to Production**
Make sure your app is deployed and accessible at your domain.

### **7.2 Update Webhook URL**
In Stripe Dashboard:
- Change webhook URL to: `https://yourdomain.com/api/webhook/stripe`
- Test the endpoint is reachable

### **7.3 Environment Variables**
Ensure production has:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## **🔍 DEBUGGING CHECKLIST**

### **Before Each Test:**
- [ ] Database migration run successfully
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local`
- [ ] Server restarted after env changes
- [ ] Webhook configured in Stripe Dashboard
- [ ] User logged in before making payment

### **After Payment:**
- [ ] Webhook logs appear in terminal
- [ ] Database shows `stripe_subscription_status = 'active'`
- [ ] `/billing` page shows "Pro Subscription Active"
- [ ] Usage API returns correct limits
- [ ] Transformations work unlimited for paid users

### **If Still Not Working:**
1. **Check webhook in Stripe Dashboard** → Event logs
2. **Verify webhook URL** is reachable
3. **Check server logs** for detailed error messages
4. **Test with Stripe CLI** for local testing
5. **Verify database permissions** for service role key

---

## **🚨 EMERGENCY FIXES**

### **Manual Database Update (Temporary)**
If webhook isn't working, manually update for testing:

```sql
-- Replace 'your-user-id' with actual user ID
UPDATE profiles 
SET 
  stripe_subscription_status = 'active',
  stripe_customer_id = 'cus_test123',
  has_access = true,
  updated_at = NOW()
WHERE id = 'your-user-id';
```

### **Force Webhook Retry**
In Stripe Dashboard:
1. Go to Webhooks → Your endpoint
2. Click on failed event
3. Click "Send again"

---

**Once you complete Steps 1-3, your subscription system should work perfectly! 🎉** 