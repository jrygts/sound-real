-- Debug Database State - Run in Supabase SQL Editor
-- This will help identify exactly what's happening with your subscription data

-- 1. Check if profiles table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check your specific user profile
SELECT 
  id,
  email,
  stripe_customer_id,
  stripe_subscription_status,
  stripe_subscription_id,
  has_access,
  price_id,
  created_at,
  updated_at
FROM profiles 
WHERE id = '3bdb2beb-622d-4c3e-a973-a99d34cc0928';

-- 3. Check if there are ANY profiles with subscription data
SELECT 
  id,
  email,
  stripe_customer_id,
  stripe_subscription_status,
  has_access,
  updated_at
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
   OR stripe_subscription_status IS NOT NULL;

-- 4. Check auth.users table for your user
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE id = '3bdb2beb-622d-4c3e-a973-a99d34cc0928'
   OR email = 'thejeremygates@gmail.com';

-- 5. Check for any RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Test if service role can access profiles
-- (This should work if webhook has proper permissions)
SELECT COUNT(*) as total_profiles FROM profiles;

-- 7. Check recent updates (if any)
SELECT 
  id,
  email,
  stripe_customer_id,
  stripe_subscription_status,
  updated_at
FROM profiles 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- 8. Check if user_usage table exists
SELECT COUNT(*) as usage_records FROM user_usage;

-- EXPECTED RESULTS:
-- - Your user profile should exist in profiles table
-- - stripe_customer_id should be populated after payment
-- - stripe_subscription_status should be 'active'
-- - has_access should be true
-- - updated_at should be recent (within last hour if webhook ran)

-- If all fields are NULL, the webhook isn't updating the database!
-- If user doesn't exist in profiles, that's the problem!
-- If RLS policies are blocking, service role needs proper setup! 