-- COMPLETE DATABASE SETUP FOR SOUND-REAL
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- 1. CREATE PROFILES TABLE (MISSING TABLE CAUSING STRIPE ISSUES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  customer_id TEXT, -- Stripe customer ID (legacy field)
  price_id TEXT, -- Stripe price ID for current subscription (legacy field)
  has_access BOOLEAN DEFAULT FALSE,
  stripe_subscription_status TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE EXISTING TABLES (IF NOT EXISTS)
-- ============================================================================

-- Create transformations table
CREATE TABLE IF NOT EXISTS transformations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  humanized_text TEXT NOT NULL,
  mode VARCHAR(50) DEFAULT 'standard',
  ai_score_before DECIMAL(3,2),
  ai_score_after DECIMAL(3,2),
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  free_uses_today INTEGER DEFAULT 0,
  total_uses INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE
);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE SECURITY POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Transformations policies
DROP POLICY IF EXISTS "Users can view own transformations" ON transformations;
CREATE POLICY "Users can view own transformations" ON transformations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transformations" ON transformations;
CREATE POLICY "Users can insert own transformations" ON transformations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage tracking policies
DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_transformations_user_id ON transformations(user_id);
CREATE INDEX IF NOT EXISTS idx_transformations_created_at ON transformations(created_at DESC);

-- ============================================================================
-- 6. CREATE AUTO-PROFILE CREATION FUNCTION
-- ============================================================================

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
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CREATE TRIGGER FOR AUTO-PROFILE CREATION
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. CREATE UTILITY FUNCTION FOR MANUAL PROFILE CREATION
-- ============================================================================

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
  RETURNING profiles.id, profiles.email, profiles.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. VERIFY SETUP
-- ============================================================================

-- Check if tables exist
SELECT 
  schemaname, 
  tablename, 
  tableowner, 
  hasindexes, 
  hasrules, 
  hastriggers 
FROM pg_tables 
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking') 
AND schemaname = 'public';

-- Check if policies exist
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'transformations', 'usage_tracking');

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Your database is now ready for:
-- ✅ User authentication with automatic profile creation
-- ✅ Stripe payments and subscription management  
-- ✅ Text transformations and usage tracking
-- ✅ Proper security with Row Level Security
-- ✅ Performance optimizations with indexes

-- Next steps:
-- 1. If you have existing users, run: SELECT public.create_profile_for_user(id, email) FROM auth.users;
-- 2. Test Stripe checkout - it should work now!
-- 3. Check /api/stripe/debug to verify everything is working 