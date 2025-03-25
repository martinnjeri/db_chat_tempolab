import { createClient } from "@supabase/supabase-js";

// Ensure we have the required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
	console.error(
		"Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
	);
}

// Create and export the Supabase client with enhanced options
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
	realtime: {
		params: {
			eventsPerSecond: 10,
		},
	},
});

// Connection state management
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectListeners: Array<(status: boolean) => void> = [];

// Function to check connection status
export async function checkConnection() {
	try {
		// Try to get the user session as a simple connection test
		const { data: authData, error: authError } =
			await supabase.auth.getSession();

		if (authError) {
			isConnected = false;
			notifyConnectionListeners(false);
			return false;
		}

		// Try a simple RPC call instead of querying a specific table
		const { data, error } = await supabase.rpc("execute_sql", {
			sql_query: "SELECT 1 as connected",
		});

		const newConnectionStatus = !error;

		// If connection status changed, notify listeners
		if (newConnectionStatus !== isConnected) {
			isConnected = newConnectionStatus;
			notifyConnectionListeners(isConnected);
		}

		// Reset reconnect attempts on successful connection
		if (isConnected) {
			reconnectAttempts = 0;
		}

		return isConnected;
	} catch (err) {
		isConnected = false;
		notifyConnectionListeners(false);
		return false;
	}
}

// Function to add connection status listener
export function addConnectionListener(listener: (status: boolean) => void) {
	reconnectListeners.push(listener);
	// Immediately notify with current status
	listener(isConnected);
	return () => {
		const index = reconnectListeners.indexOf(listener);
		if (index !== -1) {
			reconnectListeners.splice(index, 1);
		}
	};
}

// Function to notify all connection listeners
function notifyConnectionListeners(status: boolean) {
	reconnectListeners.forEach((listener) => listener(status));
}

// Function to attempt reconnection with exponential backoff
export async function attemptReconnect() {
	if (reconnectAttempts >= maxReconnectAttempts) {
		console.error("Maximum reconnection attempts reached");
		return false;
	}

	const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
	console.log(`Attempting to reconnect in ${backoffTime / 1000} seconds...`);

	await new Promise((resolve) => setTimeout(resolve, backoffTime));
	reconnectAttempts++;

	return await checkConnection();
}

// Helper function to execute SQL queries with reconnection logic
export async function executeQuery(sqlQuery: string) {
	try {
		// Add proper error handling for JSON parsing
		const { data, error } = await supabase.rpc("execute_sql", {
			sql_query: sqlQuery,
		});

		if (error) {
			console.error("SQL execution error:", error);

			// Check if error is due to connection issues
			if (
				error.message.includes("network") ||
				error.message.includes("connection") ||
				error.message.includes("syntax for type json")
			) {
				isConnected = false;
				notifyConnectionListeners(false);
				// Try to reconnect in background
				attemptReconnect();
			}

			throw error;
		}

		// Update connection status on successful query
		if (!isConnected) {
			isConnected = true;
			notifyConnectionListeners(true);
		}

		return data;
	} catch (err) {
		throw err;
	}
}
