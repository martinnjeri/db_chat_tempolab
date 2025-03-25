import { createClient } from "@supabase/supabase-js";

// Ensure we have the required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
  );
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => {
      // Add custom fetch options if needed
      return fetch(...args);
    },
  },
});

// Helper function to execute SQL queries
export async function executeQuery(sqlQuery: string) {
  try {
    const { data, error } = await supabase.rpc("execute_sql", {
      sql_query: sqlQuery,
    });

    if (error) {
      console.error("SQL execution error:", error);
      throw error;
    }

    return { data, error: null };
  } catch (err: any) {
    console.error("Query execution failed:", err);
    return { data: null, error: err };
  }
}
