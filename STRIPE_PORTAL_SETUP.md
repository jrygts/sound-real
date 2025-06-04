# 🏧 STRIPE CUSTOMER PORTAL SETUP

## 🚨 **CRITICAL ERROR IDENTIFIED**

Your logs show:
```
No configuration provided and your test mode default configuration has not been created. 
Provide a configuration or create your default by saving your customer portal settings in test mode at https://dashboard.stripe.com/test/settings/billing/portal.
```

This means the Stripe Customer Portal isn't configured yet.

## **QUICK FIX (2 minutes):**

### **Step 1: Go to Stripe Dashboard**
1. Open [Stripe Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. Make sure you're in **Test Mode** (toggle on top right)

### **Step 2: Configure Portal Settings**
1. **Business Information**:
   - Business name: `SoundReal`
   - Support email: `support@yourdomain.com`
   - Website: `https://yourdomain.com`

2. **Customer Information**:
   - ✅ Allow customers to update email
   - ✅ Allow customers to update billing address

3. **Payment Methods**:
   - ✅ Allow customers to update payment methods

4. **Invoices**:
   - ✅ Allow customers to view invoices

5. **Subscriptions**:
   - ✅ Allow customers to cancel subscriptions
   - Cancellation behavior: `Cancel immediately` or `At period end`
   - ✅ Allow customers to update subscriptions (optional)

### **Step 3: Save Configuration**
1. Scroll down and click **"Save configuration"**
2. You should see: "✅ Customer portal configuration saved"

### **Step 4: Test Portal Access**
1. Go to your `/billing` page
2. Click "Manage Subscription"
3. Should now open Stripe Customer Portal successfully!

---

## **PRODUCTION SETUP**

When you deploy to production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Repeat the configuration** for live mode
3. **Update environment variables** to use live keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   ```

---

## **VERIFICATION**

After setup, your portal should work:
- ✅ Shows current subscription
- ✅ Allows payment method updates  
- ✅ Allows subscription cancellation
- ✅ Shows billing history

If still having issues, check:
1. Configuration saved in correct mode (test vs live)
2. Using correct Stripe keys for environment
3. Customer has valid subscription in database 