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