-- 🚨 CRITICAL BILLING FIX: Add billing period tracking columns
-- This migration adds billing period tracking to prevent incorrect word usage resets

-- Add billing period tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS words_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS words_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transformations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transformations_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS period_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_billing_period_start ON profiles(billing_period_start);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_period_end ON profiles(billing_period_end);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset ON profiles(last_reset_date);

-- Update existing users with current billing period
UPDATE profiles 
SET 
  billing_period_start = COALESCE(period_start_date, CURRENT_TIMESTAMP),
  billing_period_end = CASE 
    WHEN stripe_subscription_status = 'active' AND plan_type != 'Free' 
    THEN COALESCE(period_start_date, CURRENT_TIMESTAMP) + INTERVAL '1 month'
    ELSE CURRENT_TIMESTAMP + INTERVAL '1 day'
  END,
  words_used = COALESCE(words_used, 0),
  words_limit = CASE 
    WHEN plan_type = 'Basic' THEN 5000
    WHEN plan_type = 'Plus' THEN 15000
    WHEN plan_type = 'Ultra' THEN 35000
    ELSE 0
  END,
  transformations_used = COALESCE(transformations_used, 0),
  transformations_limit = CASE 
    WHEN plan_type = 'Basic' THEN 200
    WHEN plan_type = 'Plus' THEN 600
    WHEN plan_type = 'Ultra' THEN 1200
    ELSE 5
  END,
  last_reset_date = COALESCE(last_reset_date, CURRENT_TIMESTAMP)
WHERE billing_period_start IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.billing_period_start IS 'Start of current billing period - determines when usage resets';
COMMENT ON COLUMN profiles.billing_period_end IS 'End of current billing period - when next reset occurs';
COMMENT ON COLUMN profiles.words_used IS 'Words consumed in current billing period';
COMMENT ON COLUMN profiles.words_limit IS 'Word limit for current plan';
COMMENT ON COLUMN profiles.transformations_used IS 'Transformations used (legacy for Free users)';
COMMENT ON COLUMN profiles.transformations_limit IS 'Transformation limit (legacy for Free users)';
COMMENT ON COLUMN profiles.last_reset_date IS 'Last time usage was reset';

-- Record this migration
INSERT INTO schema_migrations (name) VALUES ('07-billing-period-migration.sql')
ON CONFLICT (name) DO NOTHING; 