-- Drop and recreate the execute_sql function with better error handling
DROP FUNCTION IF EXISTS execute_sql;

CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  query_text TEXT;
BEGIN
  -- Validate the SQL query
  IF sql_query IS NULL OR LENGTH(TRIM(sql_query)) = 0 THEN
    RETURN jsonb_build_object('error', 'SQL query cannot be empty');
  END IF;

  -- Construct the query to convert results to JSON
  BEGIN
    -- Execute the query and convert the result to JSON
    query_text := 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t';
    EXECUTE query_text INTO result;
    
    -- Handle NULL result (empty result set)
    IF result IS NULL THEN
      result := '[]'::jsonb;
    END IF;
    
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- Return detailed error information
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'query', sql_query
    );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql TO anon;
