# 🎯 WEBHOOK LOCAL SETUP - Complete Solution

## 🚨 **THE CORE ISSUE**

**Webhooks don't work on localhost by default!** Stripe can't send events to `http://localhost:3000` because it's not publicly accessible.

## **SOLUTION OPTIONS**

### **Option 1: Stripe CLI (Recommended)**
✅ **Free and official**  
✅ **Perfect for development**  
✅ **Real webhook testing**

### **Option 2: Manual Testing Endpoint**
✅ **Quick testing**  
✅ **No setup required**  
✅ **Good for debugging**

---

## **OPTION 1: STRIPE CLI SETUP (RECOMMENDED)**

### **Step 1: Install Stripe CLI**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### **Step 2: Login to Stripe**
```bash
stripe login
```
This will open your browser to authenticate with Stripe.

### **Step 3: Forward Webhooks to Local Server**
```bash
# In a new terminal window, run:
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

**This will show output like:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

### **Step 4: Update Environment Variables**
Copy the webhook signing secret and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

### **Step 5: Restart Your Server**
```bash
# Stop your dev server (Ctrl+C) and restart
npm run dev
```

### **Step 6: Test the Complete Flow**
1. **Make a payment** at `/pricing`
2. **Watch both terminals** - you should see:

**Stripe CLI Terminal:**
```
2024-01-XX XX:XX:XX --> checkout.session.completed [evt_xxx]
2024-01-XX XX:XX:XX <-- [200] POST http://localhost:3000/api/webhook/stripe
```

**Your Dev Server Terminal:**
```
🔗 [Webhook] Received webhook request
🔗 [Webhook] 📨 Processing event: checkout.session.completed
🔗 [Webhook] ✅ Successfully activated subscription for user {id}
```

---

## **OPTION 2: MANUAL TESTING ENDPOINT**

If you can't use Stripe CLI, use the manual testing endpoint:

### **Step 1: Get Your User ID**
1. Go to `/billing` and open browser dev tools
2. In console, run: `console.log(user)` to get your user ID
3. Or check your Supabase auth.users table

### **Step 2: Trigger Manual Webhook**
```bash
# Replace USER_ID with your actual user ID
curl -X POST http://localhost:3000/api/webhook/stripe/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "subscription.activated",
    "userId": "3bdb2beb-622d-4c3e-a973-a99d34cc0928",
    "customerId": "cus_test_12345",
    "subscriptionId": "sub_test_12345",
    "priceId": "price_1RWIH9R2giDQL8gTtQ0SIOlM"
  }'
```

### **Step 3: Verify Results**
Check your `/billing` page - should now show "Pro Subscription Active"

---

## **COMPLETE TESTING PROTOCOL**

### **Test 1: Database Migration**
```sql
-- Run in Supabase SQL Editor first
-- Copy contents from scripts/create-usage-table.sql
```

### **Test 2: Environment Check**
```bash
node test-webhook-setup.js
```

### **Test 3: Webhook Setup**
```bash
# Terminal 1: Start your server
npm run dev

# Terminal 2: Start Stripe CLI forwarding
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### **Test 4: Complete Payment Flow**
1. **Before Payment**: Check `/billing` - should show "Free Plan"
2. **Make Payment**: Go to `/pricing` → Pay with `4242 4242 4242 4242`
3. **After Payment**: Check `/billing` - should show "Pro Subscription Active"
4. **Test Portal**: Click "Manage Subscription" - should work!

### **Test 5: Verify Database**
```sql
SELECT 
  id, 
  stripe_customer_id, 
  stripe_subscription_status, 
  has_access 
FROM profiles 
WHERE id = 'your-user-id';
```

**Expected Result**:
```
stripe_customer_id: cus_xxxxx
stripe_subscription_status: active  
has_access: true
```

---

## **DEBUGGING WEBHOOK ISSUES**

### **Issue: No Webhook Logs**
```bash
# Check if Stripe CLI is running
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Check if webhook secret is set
echo $STRIPE_WEBHOOK_SECRET
```

### **Issue: Webhook Secret Invalid**
1. Copy the secret from Stripe CLI output
2. Update `.env.local`
3. Restart your dev server

### **Issue: Profile Not Found**
```sql
-- Check if user profile exists
SELECT id, email FROM profiles WHERE id = 'your-user-id';

-- If not, create one:
INSERT INTO profiles (id, email, created_at) 
VALUES ('your-user-id', 'your-email', NOW());
```

### **Issue: Billing Portal Still Fails**
```bash
# Test portal endpoint directly
curl -X POST http://localhost:3000/api/stripe/create-portal \
  -H "Content-Type: application/json" \
  -d '{"returnUrl": "http://localhost:3000/billing"}'
```

---

## **PRODUCTION DEPLOYMENT**

### **Step 1: Deploy Your App**
Deploy to Vercel, Netlify, or your hosting platform.

### **Step 2: Configure Production Webhook**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**: `https://yourdomain.com/api/webhook/stripe`
3. **Select events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### **Step 3: Update Production Environment**
```env
STRIPE_WEBHOOK_SECRET=whsec_production_secret
STRIPE_SECRET_KEY=sk_live_...
```

---

## **SUCCESS CHECKLIST**

### **Development Setup:**
- [ ] Database migration run successfully
- [ ] Stripe CLI installed and logged in
- [ ] Webhook forwarding active
- [ ] Environment variables set
- [ ] Server restarted

### **Payment Flow Test:**
- [ ] Payment completes successfully
- [ ] Webhook logs appear in both terminals
- [ ] Database shows `stripe_subscription_status = 'active'`
- [ ] Billing page shows "Pro Subscription Active"
- [ ] "Manage Subscription" button works

### **Production Ready:**
- [ ] App deployed publicly
- [ ] Production webhook configured in Stripe
- [ ] Production environment variables set
- [ ] Test payment on live site

---

## **EMERGENCY FALLBACK**

If webhooks still don't work, use the manual test endpoint:

```bash
# Manually activate subscription for testing
curl -X POST http://localhost:3000/api/webhook/stripe/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "subscription.activated",
    "userId": "your-user-id-here"
  }'
```

**Once you complete the Stripe CLI setup, your subscription system will work perfectly!** 🎉 