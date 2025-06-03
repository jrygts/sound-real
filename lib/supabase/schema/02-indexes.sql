-- Create indexes for performance
CREATE INDEX idx_transformations_user_id ON transformations(user_id);
CREATE INDEX idx_transformations_created_at ON transformations(created_at DESC); 