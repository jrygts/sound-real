-- Create migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert our initial migrations
INSERT INTO schema_migrations (name) VALUES
  ('01-tables.sql'),
  ('02-indexes.sql'),
  ('03-policies.sql'),
  ('04-functions.sql'); 