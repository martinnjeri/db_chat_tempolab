import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Initialize the Supabase client
// Replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Connection status state
let connectionStatus: "connected" | "disconnected" | "checking" = "checking";
let connectionError: string | null = null;

// Function to test connection to Supabase
export async function testConnection() {
  try {
    connectionStatus = "checking";
    connectionError = null;

    // Simple query to test connection
    const { data, error } = await supabase
      .from("pg_tables")
      .select("tablename")
      .limit(1);

    if (error) {
      connectionStatus = "disconnected";
      connectionError = error.message;
      return { connected: false, error: error.message };
    }

    connectionStatus = "connected";
    return { connected: true, error: null };
  } catch (error: any) {
    connectionStatus = "disconnected";
    connectionError = error.message || "Unknown error";
    console.error("Error testing connection:", error);
    return { connected: false, error: error.message || "Unknown error" };
  }
}

// Function to get current connection status
export function getConnectionStatus() {
  return { status: connectionStatus, error: connectionError };
}

// Function to fetch tables from the database
export async function fetchTables() {
  try {
    // First test connection
    const connectionTest = await testConnection();
    if (!connectionTest.connected) {
      return [];
    }

    const { data, error } = await supabase.rpc("get_tables");

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching tables:", error);
    return [];
  }
}

// Function to execute a SQL query
export async function executeQuery(sqlQuery: string) {
  try {
    // Check connection first
    if (connectionStatus !== "connected") {
      const connectionTest = await testConnection();
      if (!connectionTest.connected) {
        return {
          data: null,
          error: "Database connection failed: " + connectionError,
        };
      }
    }

    const { data, error } = await supabase.rpc("execute_query", {
      query_text: sqlQuery,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Error executing query:", error);
    return { data: null, error: error.message || "Failed to execute query" };
  }
}

// Function to fetch table schema
export async function fetchTableSchema(tableName: string) {
  try {
    // Check connection first
    if (connectionStatus !== "connected") {
      const connectionTest = await testConnection();
      if (!connectionTest.connected) {
        return [];
      }
    }

    const { data, error } = await supabase.rpc("get_table_schema", {
      table_name: tableName,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching schema for table ${tableName}:`, error);
    return [];
  }
}
