-- =============================================================================
-- SECURITY FIX: Enable RLS and Create Proper Policies
-- Run this in Supabase SQL Editor to fix all security issues
-- =============================================================================

-- 1. ENABLE ROW LEVEL SECURITY (CRITICAL!)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES (Clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own transformations" ON transformations;
DROP POLICY IF EXISTS "Users can insert own transformations" ON transformations;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;

-- 3. CREATE COMPREHENSIVE POLICIES

-- PROFILES TABLE POLICIES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- TRANSFORMATIONS TABLE POLICIES  
CREATE POLICY "transformations_select_own" ON transformations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transformations_insert_own" ON transformations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USAGE_TRACKING TABLE POLICIES
CREATE POLICY "usage_tracking_select_own" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_tracking_insert_own" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_tracking_update_own" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. ADD MISSING COLUMNS TO PROFILES TABLE (for word-based billing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS words_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS words_limit INTEGER DEFAULT 5000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformations_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformations_limit INTEGER DEFAULT 200;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE;

-- 5. CREATE INCREMENT_WORDS_USED FUNCTION
CREATE OR REPLACE FUNCTION increment_words_used(uid UUID, add_words INTEGER)
RETURNS JSON AS $$
DECLARE
  current_profile RECORD;
  new_words_used INTEGER;
BEGIN
  -- Get current profile with FOR UPDATE to prevent race conditions
  SELECT words_used, words_limit, transformations_used, transformations_limit, plan_type
  INTO current_profile
  FROM profiles 
  WHERE id = uid
  FOR UPDATE;
  
  -- Check if profile exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', uid;
  END IF;
  
  -- Calculate new usage
  new_words_used := COALESCE(current_profile.words_used, 0) + add_words;
  
  -- Check if this would exceed the limit (skip for unlimited plans)
  IF current_profile.words_limit != -1 AND new_words_used > current_profile.words_limit THEN
    RAISE EXCEPTION 'limit-reached' USING DETAIL = format('Words limit exceeded: %s/%s', new_words_used, current_profile.words_limit);
  END IF;
  
  -- Update the profile
  UPDATE profiles 
  SET 
    words_used = new_words_used,
    transformations_used = COALESCE(transformations_used, 0) + 1,
    updated_at = NOW()
  WHERE id = uid;
  
  -- Return updated usage data
  RETURN json_build_object(
    'words_used', new_words_used,
    'words_limit', current_profile.words_limit,
    'transformations_used', COALESCE(current_profile.transformations_used, 0) + 1,
    'transformations_limit', current_profile.transformations_limit,
    'plan_type', current_profile.plan_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE RESET_MONTHLY_USAGE FUNCTION (for billing cycles)
CREATE OR REPLACE FUNCTION reset_monthly_usage(uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    words_used = 0,
    transformations_used = 0,
    billing_period_start = NOW(),
    billing_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. VERIFY SETUP
SELECT 'RLS Status' as check_type, 
       tablename, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking')
AND schemaname = 'public';

SELECT 'Policies' as check_type, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking')
ORDER BY tablename, policyname; 