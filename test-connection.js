// Simple script to test database connection
const { createClient } = require("@supabase/supabase-js");

// Get environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

console.log("Starting connection test script...");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Found" : "Missing");
console.log("Supabase Anon Key:", supabaseAnonKey ? "Found" : "Missing");

if (!supabaseUrl || !supabaseAnonKey) {
	console.error(
		"Missing Supabase environment variables. Check your .env.local file."
	);
	process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
	console.log("Testing Supabase connection...");

	try {
		// Test authentication
		console.log("Testing authentication...");
		const { data: authData, error: authError } =
			await supabase.auth.getSession();

		if (authError) {
			throw new Error(`Authentication error: ${authError.message}`);
		}

		console.log("Authentication successful");

		// Test execute_sql function with org_id parameter
		console.log("\nTesting execute_sql function...");
		const { data, error } = await supabase.rpc("execute_sql", {
			sql_query: "SELECT 1 as connected",
			org_id: null,
		});

		if (error) {
			throw new Error(`execute_sql error: ${error.message}`);
		}

		console.log("execute_sql function test successful");
		console.log("Result:", data);

		// Test fetching tables
		console.log("\nFetching database tables...");
		const { data: tablesData, error: tablesError } = await supabase.rpc(
			"execute_sql",
			{
				sql_query: `
        SELECT
          table_name as name
        FROM
          information_schema.tables
        WHERE
          table_schema = 'public' AND
          table_type = 'BASE TABLE'
        ORDER BY
          table_name
      `,
				org_id: null,
			}
		);

		if (tablesError) {
			throw new Error(`Error fetching tables: ${tablesError.message}`);
		}

		console.log("Successfully fetched tables:");
		console.log(tablesData);

		console.log("\nConnection test completed successfully!");
	} catch (error) {
		console.error("Connection test failed:", error.message);
		process.exit(1);
	}
}

testConnection();
