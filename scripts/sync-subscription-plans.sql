-- =============================================================================
-- SYNC EXISTING SUBSCRIPTIONS WITH NEW PLAN TYPE SYSTEM
-- Run this AFTER running fix-credit-system.sql to update existing users
-- =============================================================================

-- 1. Update existing profiles to set proper plan types based on current subscription status
UPDATE profiles 
SET 
  plan_type = CASE 
    WHEN stripe_subscription_status = 'active' THEN 'Pro'
    WHEN stripe_subscription_status IN ('past_due', 'unpaid') THEN 'Free' 
    WHEN stripe_subscription_status = 'canceled' THEN 'Free'
    ELSE 'Free'
  END,
  transformations_limit = CASE 
    WHEN stripe_subscription_status = 'active' THEN -1  -- Unlimited for Pro
    ELSE 5  -- 5 per day for Free
  END,
  transformations_used = COALESCE(transformations_used, 0),
  period_start_date = COALESCE(period_start_date, created_at, NOW()),
  last_reset_date = COALESCE(last_reset_date, 
    CASE 
      WHEN stripe_subscription_status = 'active' THEN created_at  -- Pro users reset from subscription start
      ELSE CURRENT_DATE  -- Free users reset daily
    END, 
    NOW()
  )
WHERE 
  plan_type IS NULL 
  OR transformations_limit IS NULL
  OR (stripe_subscription_status = 'active' AND plan_type != 'Pro')
  OR (stripe_subscription_status != 'active' AND plan_type != 'Free');

-- 2. Reset Free users who should have their daily limit reset
UPDATE profiles 
SET 
  transformations_used = 0,
  last_reset_date = CURRENT_DATE
WHERE 
  plan_type = 'Free' 
  AND DATE(last_reset_date) < CURRENT_DATE;

-- 3. Create or update usage_tracking records for users who don't have them
INSERT INTO usage_tracking (user_id, free_uses_today, total_uses, last_reset_date)
SELECT 
  p.id,
  CASE WHEN p.plan_type = 'Free' THEN p.transformations_used ELSE 0 END,
  (SELECT COUNT(*) FROM transformations t WHERE t.user_id = p.id),
  p.last_reset_date::date
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM usage_tracking ut WHERE ut.user_id = p.id
)
ON CONFLICT (user_id) DO UPDATE SET
  free_uses_today = EXCLUDED.free_uses_today,
  total_uses = EXCLUDED.total_uses,
  last_reset_date = EXCLUDED.last_reset_date;

-- 4. Show current status after sync
SELECT 
  'Subscription Sync Results' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN plan_type = 'Pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN plan_type = 'Free' THEN 1 END) as free_users,
  COUNT(CASE WHEN stripe_subscription_status = 'active' THEN 1 END) as active_subscriptions
FROM profiles;

-- 5. Show detailed breakdown by plan
SELECT 
  plan_type,
  stripe_subscription_status,
  transformations_limit,
  COUNT(*) as user_count,
  AVG(transformations_used) as avg_usage
FROM profiles 
GROUP BY plan_type, stripe_subscription_status, transformations_limit
ORDER BY plan_type, stripe_subscription_status;

-- =============================================================================
-- VERIFICATION QUERIES - Run these to check everything is working
-- =============================================================================

-- Check if a specific user has correct setup (replace with actual user ID)
-- SELECT * FROM get_user_usage('your-user-id-here');

-- Test the increment function (replace with actual user ID)  
-- SELECT increment_usage('your-user-id-here');

-- Check recent transformations vs usage tracking
SELECT 
  p.email,
  p.plan_type,
  p.transformations_used,
  p.transformations_limit,
  (SELECT COUNT(*) FROM transformations t WHERE t.user_id = p.id AND DATE(t.created_at) = CURRENT_DATE) as todays_transformations,
  (SELECT COUNT(*) FROM user_usage u WHERE u.user_id = p.id AND DATE(u.created_at) = CURRENT_DATE) as todays_usage_records
FROM profiles p
WHERE p.transformations_used > 0 OR EXISTS (SELECT 1 FROM transformations t WHERE t.user_id = p.id)
ORDER BY p.updated_at DESC
LIMIT 10;

-- =============================================================================
-- SYNC COMPLETE!
-- ============================================================================= 