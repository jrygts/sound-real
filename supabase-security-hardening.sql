-- ============================================================================
-- COMPREHENSIVE SUPABASE SECURITY HARDENING
-- Run this script in Supabase SQL Editor to implement all security measures
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- 2. DROP AND RECREATE ALL RLS POLICIES FOR COMPREHENSIVE COVERAGE

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Transformations table policies
DROP POLICY IF EXISTS "Users can view own transformations" ON transformations;
DROP POLICY IF EXISTS "Users can insert own transformations" ON transformations;
DROP POLICY IF EXISTS "transformations_select_own" ON transformations;
DROP POLICY IF EXISTS "transformations_insert_own" ON transformations;

CREATE POLICY "transformations_select_own" ON transformations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transformations_insert_own" ON transformations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage_tracking table policies
DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_select_own" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_insert_own" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_update_own" ON usage_tracking;

CREATE POLICY "usage_tracking_select_own" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_tracking_insert_own" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_tracking_update_own" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- User_usage table policies
DROP POLICY IF EXISTS "Users can view own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON user_usage;
DROP POLICY IF EXISTS "user_usage_select_own" ON user_usage;
DROP POLICY IF EXISTS "user_usage_insert_own" ON user_usage;

CREATE POLICY "user_usage_select_own" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_usage_insert_own" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. HARDEN ALL FUNCTIONS WITH SEARCH_PATH SECURITY

-- Harden increment_words_used function
CREATE OR REPLACE FUNCTION public.increment_words_used(uid UUID, add_words INTEGER)
RETURNS JSON AS $$
DECLARE
  current_profile RECORD;
  new_words_used INTEGER;
BEGIN
  -- Get current profile with FOR UPDATE to prevent race conditions
  SELECT words_used, words_limit, transformations_used, transformations_limit, plan_type
  INTO current_profile
  FROM public.profiles 
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
  UPDATE public.profiles 
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden increment_usage function
CREATE OR REPLACE FUNCTION public.increment_usage(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Reset usage if needed first
  PERFORM public.reset_usage_if_needed(user_id);
  
  -- Get updated profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = user_id;
  
  IF user_profile IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has remaining usage (unlimited if transformations_limit = -1)
  IF user_profile.transformations_limit != -1 AND 
     user_profile.transformations_used >= user_profile.transformations_limit THEN
    RETURN FALSE; -- Usage limit reached
  END IF;
  
  -- Increment usage counter
  UPDATE public.profiles 
  SET transformations_used = transformations_used + 1
  WHERE id = user_id;
  
  -- Record in usage log
  INSERT INTO public.user_usage (user_id, action, created_at)
  VALUES (user_id, 'transformation', NOW());
  
  RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden get_user_usage function
CREATE OR REPLACE FUNCTION public.get_user_usage(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  result JSON;
  next_reset_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Reset usage if needed first
  PERFORM public.reset_usage_if_needed(user_id);
  
  -- Get updated profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = user_id;
  
  IF user_profile IS NULL THEN
    RETURN json_build_object(
      'error', 'User profile not found'
    );
  END IF;
  
  -- Calculate next reset date
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
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden create_profile_for_user function
CREATE OR REPLACE FUNCTION public.create_profile_for_user(user_id UUID, user_email TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (user_id, user_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW()
  RETURNING public.profiles.id, public.profiles.email, public.profiles.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden reset_usage_if_needed function
CREATE OR REPLACE FUNCTION public.reset_usage_if_needed(user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_profile RECORD;
  should_reset BOOLEAN := FALSE;
  new_limit INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = user_id;
  
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
    UPDATE public.profiles 
    SET 
      transformations_used = 0,
      transformations_limit = new_limit,
      last_reset_date = NOW()
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden increment function
CREATE OR REPLACE FUNCTION public.increment(
  table_name text,
  column_name text,
  user_id uuid
) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + 1 WHERE user_id = $1',
    table_name,
    column_name,
    column_name
  ) USING user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Harden reset_monthly_usage function
CREATE OR REPLACE FUNCTION public.reset_monthly_usage(uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    words_used = 0,
    transformations_used = 0,
    billing_period_start = NOW(),
    billing_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. ENSURE ALL REQUIRED COLUMNS EXIST
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS words_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS words_limit INTEGER DEFAULT 5000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformations_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformations_limit INTEGER DEFAULT 200;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS period_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. CREATE USER_USAGE TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) DEFAULT 'transformation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_usage if not already enabled
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- 6. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_period ON profiles(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_created_at ON user_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformations_user_id ON transformations(user_id);
CREATE INDEX IF NOT EXISTS idx_transformations_created_at ON transformations(created_at DESC);

-- 7. GRANT NECESSARY PERMISSIONS
GRANT EXECUTE ON FUNCTION public.increment_words_used(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_usage_if_needed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_usage(UUID) TO authenticated;

-- 8. VERIFICATION QUERIES
SELECT 'RLS Status' as check_type, 
       tablename, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking', 'user_usage')
AND schemaname = 'public'
ORDER BY tablename;

SELECT 'Policies' as check_type, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking', 'user_usage')
ORDER BY tablename, policyname;

SELECT 'Functions' as check_type, 
       proname as function_name,
       prosecdef as is_security_definer,
       (SELECT string_agg(name || '=' || setting, ', ') 
        FROM pg_settings 
        WHERE name = ANY(proconfig)) as search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN (
    'increment_words_used', 
    'handle_new_user', 
    'increment_usage', 
    'get_user_usage', 
    'create_profile_for_user', 
    'reset_usage_if_needed', 
    'update_updated_at_column', 
    'increment',
    'reset_monthly_usage'
  )
ORDER BY proname;
