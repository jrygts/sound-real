-- Function to increment a column value
CREATE OR REPLACE FUNCTION increment(
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 