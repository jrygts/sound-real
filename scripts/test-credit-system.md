# 🧪 COMPLETE CREDIT SYSTEM TESTING GUIDE

## 📋 **WHAT WAS FIXED:**

### **1. Database Issues ✅**
- ❌ **OLD**: `user_usage` table missing (error code 42P01)
- ✅ **NEW**: `user_usage` table created with proper schema
- ❌ **OLD**: No plan-specific credit fields in profiles
- ✅ **NEW**: Added `transformations_used`, `transformations_limit`, `plan_type`, `period_start_date`, `last_reset_date`

### **2. Static Credit Display ✅**
- ❌ **OLD**: Hardcoded "600" for all plans 
- ✅ **NEW**: Dynamic credits based on actual subscription:
  - **Free Plan**: 5 transformations per day
  - **Pro Plan**: Unlimited transformations (-1)

### **3. Reset Date Logic ✅**
- ❌ **OLD**: Wrong reset dates like "6/30/2025"
- ✅ **NEW**: Correct reset logic:
  - **Free Plan**: Daily reset (tomorrow at midnight)
  - **Pro Plan**: Monthly reset from subscription start date

### **4. Usage Tracking ✅**
- ❌ **OLD**: No actual usage tracking despite showing "0 of 600"
- ✅ **NEW**: Real usage tracking:
  - Increments on each transformation
  - Respects plan limits
  - Prevents usage when limit reached

### **5. Plan Detection ✅**
- ❌ **OLD**: Unreliable plan detection from `price_id`
- ✅ **NEW**: Robust plan detection from `stripe_subscription_status`

---

## 🚀 **SETUP INSTRUCTIONS:**

### **Step 1: Run Database Migrations**
```sql
-- In Supabase SQL Editor, run these in order:

-- 1. Main credit system fix
\i scripts/fix-credit-system.sql

-- 2. Sync existing users
\i scripts/sync-subscription-plans.sql
```

### **Step 2: Verify Database Setup**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('profiles', 'user_usage', 'transformations');

-- Check new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('plan_type', 'transformations_used', 'transformations_limit');

-- Check your user profile
SELECT id, email, plan_type, transformations_used, transformations_limit, 
       stripe_subscription_status, last_reset_date 
FROM profiles 
WHERE email = 'your-email@example.com';
```

---

## 🧪 **TESTING PROTOCOL:**

### **Test 1: Free User Credit System**

#### **Setup:**
1. Create a new user account (or use existing free user)
2. Verify they have no active subscription

#### **Expected Results:**
- Billing page shows: **"5 transformations per day"**
- Usage display: **"0/5 daily"**
- Reset date: **Tomorrow's date**

#### **Test Actions:**
```bash
# 1. Check initial usage
curl http://localhost:3000/api/subscription/usage

# Expected response:
{
  "success": true,
  "usage": {
    "totalUsed": 0,
    "limit": 5,
    "remaining": 5,
    "plan": "Free",
    "hasAccess": true,
    "isAdmin": false,
    "resetDate": "2024-12-XX" // Tomorrow
  }
}
```

#### **Test Transformations:**
1. Do 1 transformation → Usage becomes "1/5 daily"
2. Do 2 more transformations → Usage becomes "3/5 daily"  
3. Do 2 more transformations → Usage becomes "5/5 daily"
4. Try 6th transformation → Should get error: **"Usage limit reached"**

---

### **Test 2: Pro User Credit System**

#### **Setup:**
1. User with active subscription (`stripe_subscription_status = 'active'`)
2. Check billing page before testing

#### **Expected Results:**
- Billing page shows: **"Unlimited transformations"**
- Usage display: **"X of unlimited"** or just **"Unlimited"**
- Reset date: **Monthly reset from subscription start**

#### **Test Actions:**
```bash
# Check Pro user usage
curl http://localhost:3000/api/subscription/usage

# Expected response:
{
  "success": true,
  "usage": {
    "totalUsed": 0,
    "limit": -1,  // -1 means unlimited
    "remaining": -1,
    "plan": "Pro", 
    "hasAccess": true,
    "isAdmin": false,
    "resetDate": "2024-01-XX" // Next month
  }
}
```

#### **Test Unlimited Transformations:**
1. Do 10+ transformations rapidly
2. All should succeed
3. Usage counter should increment but never block

---

### **Test 3: Usage Reset Logic**

#### **Free User Daily Reset:**
```sql
-- Manually test reset logic
SELECT get_user_usage('your-free-user-id');

-- Set usage to limit
UPDATE profiles SET transformations_used = 5 WHERE id = 'your-free-user-id';

-- Set last reset to yesterday  
UPDATE profiles SET last_reset_date = CURRENT_DATE - 1 WHERE id = 'your-free-user-id';

-- Check again - should auto-reset to 0
SELECT get_user_usage('your-free-user-id');
```

#### **Pro User Monthly Reset:**
```sql
-- Set Pro user's last reset to last month
UPDATE profiles 
SET last_reset_date = NOW() - INTERVAL '32 days',
    transformations_used = 999
WHERE id = 'your-pro-user-id';

-- Check - should reset for Pro users past monthly date
SELECT get_user_usage('your-pro-user-id');
```

---

### **Test 4: Subscription Changes**

#### **Free → Pro Upgrade:**
1. Start with Free user (5/day limit)
2. Complete Stripe checkout for Pro plan
3. Webhook should update `stripe_subscription_status = 'active'`
4. Run sync script or wait for next API call
5. User should now have unlimited transformations

#### **Pro → Free Downgrade:**
1. Start with Pro user (unlimited)
2. Cancel subscription in Stripe
3. Webhook updates `stripe_subscription_status = 'canceled'`
4. Run sync script or wait for next API call  
5. User should now have 5/day limit

---

### **Test 5: Error Handling**

#### **Database Function Fallback:**
```sql
-- Temporarily break the database function
DROP FUNCTION get_user_usage(UUID);

-- API should fallback gracefully to profile data
curl http://localhost:3000/api/subscription/usage
# Should still work with basic profile info
```

#### **Usage Table Missing:**
```sql
-- Temporarily drop usage table
DROP TABLE user_usage;

-- API should handle gracefully and log warnings
curl -X POST http://localhost:3000/api/subscription/usage
# Should not crash, just log warnings
```

---

## 🔍 **VERIFICATION QUERIES:**

### **Check Overall System Health:**
```sql
-- Show all users with their credit status
SELECT 
  p.email,
  p.plan_type,
  p.transformations_used,
  p.transformations_limit,
  p.stripe_subscription_status,
  (SELECT COUNT(*) FROM transformations t WHERE t.user_id = p.id) as total_transformations,
  (SELECT COUNT(*) FROM user_usage u WHERE u.user_id = p.id) as usage_records
FROM profiles p
ORDER BY p.updated_at DESC;
```

### **Check Reset Logic:**
```sql
-- Users who should reset today
SELECT 
  email, 
  plan_type, 
  transformations_used, 
  last_reset_date
FROM profiles 
WHERE 
  (plan_type = 'Free' AND DATE(last_reset_date) < CURRENT_DATE)
  OR (plan_type = 'Pro' AND last_reset_date + INTERVAL '1 month' <= NOW());
```

### **Check Usage Accuracy:**
```sql
-- Compare actual transformations vs tracked usage
SELECT 
  p.email,
  p.transformations_used as tracked_usage,
  (SELECT COUNT(*) FROM transformations t 
   WHERE t.user_id = p.id 
   AND DATE(t.created_at) = CURRENT_DATE) as actual_todays_transforms,
  (SELECT COUNT(*) FROM user_usage u 
   WHERE u.user_id = p.id 
   AND DATE(u.created_at) = CURRENT_DATE) as todays_usage_records
FROM profiles p
WHERE p.plan_type = 'Free'
AND p.transformations_used > 0;
```

---

## ✅ **SUCCESS CRITERIA:**

### **Free Users:**
- [ ] Shows "5 transformations per day" 
- [ ] Tracks usage accurately (increments on each transformation)
- [ ] Blocks at 5 transformations with clear error message
- [ ] Resets daily at midnight
- [ ] Shows correct reset date (tomorrow)

### **Pro Users:** 
- [ ] Shows "Unlimited transformations"
- [ ] Never blocks transformations
- [ ] Tracks usage for analytics but doesn't enforce limits
- [ ] Resets monthly from subscription start date
- [ ] Shows correct monthly reset date

### **Plan Changes:**
- [ ] Free → Pro: Immediately gets unlimited access
- [ ] Pro → Free: Immediately gets daily limits
- [ ] Subscription status changes update plan_type correctly

### **Error Handling:**
- [ ] Graceful fallback when database functions fail
- [ ] Clear error messages when limits are reached
- [ ] No system crashes from missing tables/functions

---

## 🚨 **TROUBLESHOOTING:**

### **"user_usage table not found"**
```sql
-- Run the fix script
\i scripts/fix-credit-system.sql
```

### **Wrong plan detected**
```sql
-- Run the sync script
\i scripts/sync-subscription-plans.sql

-- Or manually fix specific user
UPDATE profiles 
SET plan_type = 'Pro', transformations_limit = -1 
WHERE stripe_subscription_status = 'active' AND id = 'user-id';
```

### **Usage not incrementing**
```sql
-- Test the increment function directly
SELECT increment_usage('your-user-id');

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_usage';
```

### **Reset not working**
```sql
-- Test reset function directly
SELECT reset_usage_if_needed('your-user-id');

-- Check current profile state
SELECT * FROM profiles WHERE id = 'your-user-id';
```

---

🎉 **After all tests pass, your credit system is fully functional!** 