-- Enable Row Level Security on our tables
ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can view own transformations" ON transformations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transformations" ON transformations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR ALL USING (auth.uid() = user_id); 