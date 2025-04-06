/**
 * Patient SQL Enhancer - Adds doctor names to patient queries and ensures proper joins
 */

/**
 * Enhances SQL queries to include doctor names when querying patients
 * @param sqlQuery The original SQL query
 * @returns The enhanced SQL query
 */
export function enhancePatientQueries(sqlQuery: string): string {
	// Check if this is a query involving patients
	const isPatientQuery = /\bfrom\s+patients\b/i.test(sqlQuery);

	if (!isPatientQuery) {
		return sqlQuery;
	}

	// Check if the query already has a JOIN with doctors
	const hasDoctorJoin = /\bjoin\s+doctors\b/i.test(sqlQuery);

	// Modify the query to include doctor name if needed
	let enhancedQuery = sqlQuery;

	if (!hasDoctorJoin) {
		// If the query has a WHERE clause
		if (/\bwhere\b/i.test(enhancedQuery)) {
			// Add JOIN before WHERE
			enhancedQuery = enhancedQuery.replace(
				/\bfrom\s+patients\b(.*?)\bwhere\b/i,
				"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id$1WHERE"
			);
		} else if (/\border\s+by\b/i.test(enhancedQuery)) {
			// Add JOIN before ORDER BY
			enhancedQuery = enhancedQuery.replace(
				/\bfrom\s+patients\b(.*?)\border\s+by\b/i,
				"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id$1ORDER BY"
			);
		} else if (/\bgroup\s+by\b/i.test(enhancedQuery)) {
			// Add JOIN before GROUP BY
			enhancedQuery = enhancedQuery.replace(
				/\bfrom\s+patients\b(.*?)\bgroup\s+by\b/i,
				"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id$1GROUP BY"
			);
		} else if (/\blimit\b/i.test(enhancedQuery)) {
			// Add JOIN before LIMIT
			enhancedQuery = enhancedQuery.replace(
				/\bfrom\s+patients\b(.*?)\blimit\b/i,
				"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id$1LIMIT"
			);
		} else {
			// Add JOIN at the end
			enhancedQuery = enhancedQuery.replace(
				/\bfrom\s+patients\b/i,
				"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id"
			);
		}

		// Add doctor_name to the SELECT clause if it's not already there
		if (!enhancedQuery.includes("doctor_name")) {
			enhancedQuery = enhancedQuery.replace(
				/\bselect\b(.*?)\bfrom\b/i,
				"SELECT$1, doctors.name as doctor_name FROM"
			);
		}
	}

	// Ensure we're not using * when joining tables
	if (hasDoctorJoin || enhancedQuery !== sqlQuery) {
		// Replace "SELECT *" with explicit column names to avoid ambiguity
		if (/\bselect\s+\*\b/i.test(enhancedQuery)) {
			enhancedQuery = enhancedQuery.replace(
				/\bselect\s+\*\b/i,
				"SELECT patients.id, patients.name, patients.age, patients.gender, patients.address, patients.phone, patients.email, patients.doctor_id, patients.medical_history, patients.last_visit"
			);
		}

		// Replace "SELECT patients.*" with explicit column names
		if (/\bselect\s+patients\.\*\b/i.test(enhancedQuery)) {
			enhancedQuery = enhancedQuery.replace(
				/\bselect\s+patients\.\*\b/i,
				"SELECT patients.id, patients.name, patients.age, patients.gender, patients.address, patients.phone, patients.email, patients.doctor_id, patients.medical_history, patients.last_visit"
			);
		}
	}

	// Increase the LIMIT to show more results if a small limit is set
	if (/\blimit\s+([0-9]+)\b/i.test(enhancedQuery)) {
		const limitMatch = enhancedQuery.match(/\blimit\s+([0-9]+)\b/i);
		if (limitMatch && parseInt(limitMatch[1]) < 10) {
			enhancedQuery = enhancedQuery.replace(
				/\blimit\s+([0-9]+)\b/i,
				"LIMIT 20"
			);
		}
	}

	console.log("Enhanced patient query:", enhancedQuery);
	return enhancedQuery;
}
