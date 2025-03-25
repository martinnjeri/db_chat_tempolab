-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.execute_sql(text);

-- Create a function to execute dynamic SQL queries
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Basic SQL injection prevention
    IF position(';' in sql_query) > 0 THEN
        RAISE EXCEPTION 'Multiple statements are not allowed';
    END IF;

    IF NOT (
        sql_query ILIKE 'SELECT%' OR 
        sql_query ILIKE 'WITH%'
    ) THEN
        RAISE EXCEPTION 'Only SELECT statements are allowed';
    END IF;

    -- Execute the query and convert results to JSON
    EXECUTE format('
        WITH query_result AS (%s)
        SELECT jsonb_agg(row_to_json(query_result))
        FROM query_result;
    ', sql_query) INTO result;

    -- Handle NULL result (no rows)
    IF result IS NULL THEN
        result := '[]'::jsonb;
    END IF;

    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'query', sql_query
        );
END;
$$; 