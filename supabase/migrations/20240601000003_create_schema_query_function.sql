-- Create a function to get database schema information
CREATE OR REPLACE FUNCTION get_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT json_agg(json_build_object(
    'name', table_name
  ))
  INTO result
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_columns(table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT json_agg(json_build_object(
    'name', column_name,
    'type', data_type,
    'is_primary', (CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END),
    'is_foreign', (CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END)
  ))
  INTO result
  FROM information_schema.columns c
  LEFT JOIN (
    SELECT kcu.column_name 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = table_name
  ) pk ON c.column_name = pk.column_name
  LEFT JOIN (
    SELECT kcu.column_name 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = table_name
  ) fk ON c.column_name = fk.column_name
  WHERE c.table_name = table_name AND c.table_schema = 'public'
  ORDER BY ordinal_position;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tables() TO anon;
GRANT EXECUTE ON FUNCTION get_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_columns(TEXT) TO anon;
