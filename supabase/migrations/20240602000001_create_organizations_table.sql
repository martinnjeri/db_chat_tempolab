-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Enable realtime for organizations table
alter publication supabase_realtime add table organizations;

-- Create function to get organizations
CREATE OR REPLACE FUNCTION get_organizations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(org))
    FROM (
      SELECT * FROM organizations ORDER BY name
    ) org
  );
END;
$$;

-- Modify execute_sql function to respect organization boundaries
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT, org_id INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  modified_query TEXT;
  error_message TEXT;
BEGIN
  -- If organization ID is provided, modify the query to filter by organization
  IF org_id IS NOT NULL THEN
    -- This is a simplified approach. In a real-world scenario, you'd need more sophisticated query parsing
    -- Check if the query contains a WHERE clause
    IF position('WHERE' in upper(sql_query)) > 0 THEN
      -- Add organization filter to existing WHERE clause
      modified_query := regexp_replace(
        sql_query,
        'WHERE',
        format('WHERE (organization_id = %s OR organization_id IS NULL) AND', org_id),
        1,
        1,
        'i'
      );
    ELSE
      -- Check if the query contains a FROM clause
      IF position('FROM' in upper(sql_query)) > 0 THEN
        -- Add WHERE clause with organization filter after the FROM clause and any table name
        modified_query := regexp_replace(
          sql_query,
          'FROM\s+([^\s]+)',
          format('FROM \1 WHERE (organization_id = %s OR organization_id IS NULL)', org_id),
          1,
          1,
          'i'
        );
      ELSE
        -- If no FROM clause, use the original query (might be a simple query like SELECT 1)
        modified_query := sql_query;
      END IF;
    END IF;
  ELSE
    -- If no organization ID, use the original query
    modified_query := sql_query;
  END IF;

  -- Execute the modified query
  BEGIN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', modified_query) INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    RETURN jsonb_build_object('error', error_message);
  END;
END;
$$;