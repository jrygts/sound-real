# Step 1: Database Setup

## Supabase SQL Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create transformations table
CREATE TABLE transformations (
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
CREATE TABLE usage_tracking (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  free_uses_today INTEGER DEFAULT 0,
  total_uses INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE
);

-- Row Level Security Policies
CREATE POLICY "Users can view own transformations" ON transformations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transformations" ON transformations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_transformations_user_id ON transformations(user_id);
CREATE INDEX idx_transformations_created_at ON transformations(created_at DESC);
```

## Database Structure Overview

1. **Transformations Table**
   - Stores all text transformations
   - Tracks AI scores before and after
   - Links to user accounts
   - Includes metadata like word count and creation time

2. **Usage Tracking Table**
   - Monitors user usage limits
   - Tracks daily free uses
   - Maintains total usage count
   - Handles usage reset dates

3. **Security**
   - Row Level Security enabled
   - Users can only access their own data
   - Proper indexing for performance 