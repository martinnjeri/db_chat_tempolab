import { createClient } from "@supabase/supabase-js";
import { enhanceDoctorQueries } from "./sqlEnhancer";

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
			org_id: null,
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

// Current organization context
let currentOrganizationId: number | null = null;
let selectedOrganizationIds: number[] = [];
let selectedDoctorIds: number[] = [];

// Set the current organization context
export function setCurrentOrganization(orgId: number | null) {
	currentOrganizationId = orgId;
	console.log(`Set current organization to: ${orgId}`);
}

// Get the current organization context
export function getCurrentOrganization() {
	return currentOrganizationId;
}

// Set selected organizations
export function setSelectedOrganizations(orgIds: number[]) {
	selectedOrganizationIds = orgIds;
	console.log(`Set selected organizations to: ${orgIds.join(", ")}`);

	// Trigger a test query to verify the filters are working
	setTimeout(() => {
		executeQuery("SELECT 'test' as result")
			.then((data) => {
				console.log("Test query with filters:", data);
			})
			.catch((err) => {
				console.error("Test query error:", err);
			});
	}, 500);
}

// Get selected organizations
export function getSelectedOrganizations() {
	return selectedOrganizationIds;
}

// Set selected doctors
export function setSelectedDoctors(doctorIds: number[]) {
	selectedDoctorIds = doctorIds;
	console.log(`Set selected doctors to: ${doctorIds.join(", ")}`);

	// Trigger a test query to verify the filters are working
	setTimeout(() => {
		executeQuery("SELECT 'test' as result")
			.then((data) => {
				console.log("Test query with filters:", data);
			})
			.catch((err) => {
				console.error("Test query error:", err);
			});
	}, 500);
}

// Get selected doctors
export function getSelectedDoctors() {
	return selectedDoctorIds;
}

// Use the SQL enhancer to add organization names to doctor queries

// Helper function to execute SQL queries with reconnection logic and filtering
export async function executeQuery(sqlQuery: string) {
	try {
		// Enhance the query to include organization names for doctor queries
		let modifiedQuery = enhanceDoctorQueries(sqlQuery);

		// Modify the SQL query to include filters for organizations and doctors if they are selected

		// Only apply filters if they are selected and the query is a SELECT statement
		if (
			(selectedOrganizationIds.length > 0 ||
				selectedDoctorIds.length > 0) &&
			sqlQuery.trim().toLowerCase().startsWith("select")
		) {
			// Check if the query already has a WHERE clause
			const hasWhere = /\bwhere\b/i.test(sqlQuery);

			// Add organization filter if organizations are selected
			if (selectedOrganizationIds.length > 0) {
				const orgFilter = `organizations.id IN (${selectedOrganizationIds.join(", ")})`;

				if (hasWhere) {
					// Add to existing WHERE clause
					modifiedQuery = modifiedQuery.replace(
						/\bwhere\b/i,
						`WHERE (${orgFilter}) AND `
					);
				} else if (/\bfrom\b.*\borganizations\b/i.test(sqlQuery)) {
					// Add WHERE clause after FROM if it's querying the organizations table
					modifiedQuery = modifiedQuery.replace(
						/(\bfrom\b.*?\borganizations\b.*?)(?:\b(group|order|limit|having)\b|$)/i,
						`$1 WHERE ${orgFilter} $2`
					);
				}
			}

			// Add doctor filter if doctors are selected
			if (selectedDoctorIds.length > 0) {
				const doctorFilter = `doctors.id IN (${selectedDoctorIds.join(", ")})`;

				if (/\bwhere\b/i.test(modifiedQuery)) {
					// Add to existing WHERE clause
					modifiedQuery = modifiedQuery.replace(
						/\bwhere\b(.*?)(?:\b(group|order|limit|having)\b|$)/i,
						`WHERE$1 AND (${doctorFilter}) $2`
					);
				} else if (/\bfrom\b.*\bdoctors\b/i.test(sqlQuery)) {
					// Add WHERE clause after FROM if it's querying the doctors table
					modifiedQuery = modifiedQuery.replace(
						/(\bfrom\b.*?\bdoctors\b.*?)(?:\b(group|order|limit|having)\b|$)/i,
						`$1 WHERE ${doctorFilter} $2`
					);
				}
			}
		}

		console.log("Original query:", sqlQuery);
		console.log("Modified query:", modifiedQuery);

		// Execute the modified query
		const { data, error } = await supabase.rpc("execute_sql", {
			sql_query: modifiedQuery,
			org_id: currentOrganizationId || null,
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

// Function to fetch organizations
export async function fetchOrganizations() {
	try {
		const { data, error } = await supabase.rpc("get_organizations");

		if (error) {
			console.error("Error fetching organizations:", error);
			throw error;
		}

		return data || [];
	} catch (err) {
		console.error("Failed to fetch organizations:", err);
		throw err;
	}
}
