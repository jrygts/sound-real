-- =============================================================================
-- COMPLETE CREDIT SYSTEM FIX FOR SOUND-REAL
-- Run this in Supabase SQL Editor to fix all credit system issues
-- =============================================================================

-- 1. CREATE user_usage table if it doesn't exist (this is why usage tracking fails)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) DEFAULT 'transformation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_created_at ON user_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_date ON user_usage(user_id, created_at);

-- 3. Enable RLS on user_usage table
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_usage
CREATE POLICY IF NOT EXISTS "Users can view own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own usage" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Add missing fields to profiles table for proper subscription tracking
DO $$ 
BEGIN
  -- Add transformations_used field if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'transformations_used') THEN
    ALTER TABLE profiles ADD COLUMN transformations_used INTEGER DEFAULT 0;
  END IF;

  -- Add transformations_limit field if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'transformations_limit') THEN
    ALTER TABLE profiles ADD COLUMN transformations_limit INTEGER DEFAULT 5;
  END IF;

  -- Add period_start_date field if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'period_start_date') THEN
    ALTER TABLE profiles ADD COLUMN period_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add last_reset_date field if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'last_reset_date') THEN
    ALTER TABLE profiles ADD COLUMN last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add plan_type field if it doesn't exist (Free, Pro, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN
    ALTER TABLE profiles ADD COLUMN plan_type VARCHAR(50) DEFAULT 'Free';
  END IF;
END $$;

-- 6. Create function to reset usage counters based on plan type
CREATE OR REPLACE FUNCTION reset_usage_if_needed(user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_profile RECORD;
  should_reset BOOLEAN := FALSE;
  new_limit INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;
  
  -- Determine if we should reset based on plan type
  IF user_profile.plan_type = 'Free' THEN
    -- Free plan resets daily
    should_reset := DATE(user_profile.last_reset_date) < CURRENT_DATE;
    new_limit := 5;
  ELSE
    -- Pro plans reset monthly based on subscription start date
    should_reset := (user_profile.last_reset_date + INTERVAL '1 month') <= NOW();
    new_limit := -1; -- -1 means unlimited
  END IF;
  
  -- Reset if needed
  IF should_reset THEN
    UPDATE profiles 
    SET 
      transformations_used = 0,
      transformations_limit = new_limit,
      last_reset_date = NOW()
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Reset usage if needed first
  PERFORM reset_usage_if_needed(user_id);
  
  -- Get updated profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_id;
  
  IF user_profile IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has remaining usage (unlimited if transformations_limit = -1)
  IF user_profile.transformations_limit != -1 AND 
     user_profile.transformations_used >= user_profile.transformations_limit THEN
    RETURN FALSE; -- Usage limit reached
  END IF;
  
  -- Increment usage counter
  UPDATE profiles 
  SET transformations_used = transformations_used + 1
  WHERE id = user_id;
  
  -- Record in usage log
  INSERT INTO user_usage (user_id, action, created_at)
  VALUES (user_id, 'transformation', NOW());
  
  RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get user usage info
CREATE OR REPLACE FUNCTION get_user_usage(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  result JSON;
BEGIN
  -- Reset usage if needed first
  PERFORM reset_usage_if_needed(user_id);
  
  -- Get updated profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_id;
  
  IF user_profile IS NULL THEN
    RETURN json_build_object(
      'error', 'User profile not found'
    );
  END IF;
  
  -- Calculate next reset date
  DECLARE
    next_reset_date TIMESTAMP WITH TIME ZONE;
  BEGIN
    IF user_profile.plan_type = 'Free' THEN
      -- Next day for free users
      next_reset_date := DATE(NOW()) + INTERVAL '1 day';
    ELSE
      -- Next month from last reset for pro users
      next_reset_date := user_profile.last_reset_date + INTERVAL '1 month';
    END IF;
    
    result := json_build_object(
      'totalUsed', user_profile.transformations_used,
      'limit', user_profile.transformations_limit,
      'remaining', CASE 
        WHEN user_profile.transformations_limit = -1 THEN -1
        ELSE GREATEST(0, user_profile.transformations_limit - user_profile.transformations_used)
      END,
      'plan', user_profile.plan_type,
      'hasAccess', CASE 
        WHEN user_profile.transformations_limit = -1 THEN true
        ELSE user_profile.transformations_used < user_profile.transformations_limit
      END,
      'resetDate', next_reset_date,
      'isAdmin', false
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update existing profiles to have correct plan types based on subscription status
UPDATE profiles 
SET 
  plan_type = CASE 
    WHEN stripe_subscription_status = 'active' THEN 'Pro'
    ELSE 'Free'
  END,
  transformations_limit = CASE 
    WHEN stripe_subscription_status = 'active' THEN -1
    ELSE 5
  END,
  period_start_date = COALESCE(period_start_date, created_at, NOW()),
  last_reset_date = COALESCE(last_reset_date, created_at, NOW())
WHERE plan_type IS NULL OR transformations_limit IS NULL;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION reset_usage_if_needed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage(UUID) TO authenticated;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that all tables exist
SELECT 'Tables created:' as status, 
       (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN '✅ profiles' ELSE '❌ profiles' END ||
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_usage') THEN ' ✅ user_usage' ELSE ' ❌ user_usage' END ||
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transformations') THEN ' ✅ transformations' ELSE ' ❌ transformations' END) as tables;

-- Check that new columns exist
SELECT 'New fields:' as status,
       (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transformations_used') THEN '✅ transformations_used' ELSE '❌ transformations_used' END ||
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transformations_limit') THEN ' ✅ transformations_limit' ELSE ' ❌ transformations_limit' END ||
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN ' ✅ plan_type' ELSE ' ❌ plan_type' END) as fields;

-- Show user profiles with new credit info
SELECT 
  id,
  email,
  plan_type,
  transformations_used,
  transformations_limit,
  stripe_subscription_status,
  last_reset_date
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- =============================================================================
-- SETUP COMPLETE! 
-- =============================================================================
-- Next steps:
-- 1. Update the API endpoints to use the new database functions
-- 2. Test the credit system with actual transformations
-- 3. Verify the usage tracking and reset logic
-- ============================================================================= 