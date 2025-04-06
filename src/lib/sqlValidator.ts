/**
 * SQL Validator - Validates and fixes common SQL errors
 */

/**
 * Validates and fixes common SQL errors
 * @param sql The SQL query to validate
 * @returns The fixed SQL query
 */
export function validateAndFixSQL(sql: string): string {
	// Trim whitespace and remove trailing semicolon
	let fixedSQL = sql.trim().replace(/;$/, "");

	// Check for missing FROM clause
	if (
		/SELECT.*?(?:WHERE|GROUP BY|ORDER BY|LIMIT)/i.test(fixedSQL) &&
		!/FROM/i.test(fixedSQL)
	) {
		console.error("SQL Error: Missing FROM clause");
		return "Error: Missing FROM clause. Please specify which table to query from.";
	}

	// Check for missing FROM-clause entry for tables
	const fromClauseError = fixedSQL.match(
		/missing FROM-clause entry for table "([^"]+)"/i
	);
	if (fromClauseError) {
		const missingTable = fromClauseError[1];
		console.error(
			`SQL Error: Missing FROM-clause entry for table "${missingTable}"`
		);

		// Try to fix the query by adding the missing table with appropriate JOIN
		if (missingTable === "organizations") {
			// If organizations is missing, add it with a JOIN to doctors
			if (
				/FROM\s+doctors/i.test(fixedSQL) &&
				!/JOIN\s+organizations/i.test(fixedSQL)
			) {
				fixedSQL = fixedSQL.replace(
					/FROM\s+doctors/i,
					"FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id"
				);
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			}
		} else if (missingTable === "doctors") {
			// If doctors is missing, add it with a JOIN to patients
			if (
				/FROM\s+patients/i.test(fixedSQL) &&
				!/JOIN\s+doctors/i.test(fixedSQL)
			) {
				fixedSQL = fixedSQL.replace(
					/FROM\s+patients/i,
					"FROM patients LEFT JOIN doctors ON patients.doctor_id = doctors.id"
				);
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			}
		} else if (missingTable === "patients") {
			// If patients is missing, add it with a JOIN to doctors
			if (
				/FROM\s+doctors/i.test(fixedSQL) &&
				!/JOIN\s+patients/i.test(fixedSQL)
			) {
				fixedSQL = fixedSQL.replace(
					/FROM\s+doctors/i,
					"FROM doctors LEFT JOIN patients ON patients.doctor_id = doctors.id"
				);
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			}
		}

		// If we couldn't fix it automatically, suggest a more specific query
		if (missingTable === "patients") {
			return "Error: To query patient data, try asking 'Show me all patients' or 'List patients with their doctors'";
		} else if (missingTable === "doctors") {
			return "Error: To query doctor data, try asking 'Show me all doctors' or 'List doctors with their organizations'";
		} else if (missingTable === "organizations") {
			return "Error: To query organization data, try asking 'Show me all organizations' or 'List doctors by organization'";
		}

		return `Error: Missing FROM-clause entry for table "${missingTable}". Please include this table in your query with the appropriate JOIN.`;
	}

	// Check for column reference errors
	const columnReferenceError = fixedSQL.match(
		/column "([^"]+)" does not exist/i
	);
	if (columnReferenceError) {
		const missingColumn = columnReferenceError[1];
		console.error(`SQL Error: Column "${missingColumn}" does not exist`);
		return `Error: Column "${missingColumn}" does not exist. Please check the column name and table reference.`;
	}

	// Check for syntax errors
	if (fixedSQL.includes("syntax error")) {
		console.error("SQL Error: Syntax error");
		return "Error: SQL syntax error. Please check your query syntax.";
	}

	// Check for ambiguous column references
	const ambiguousColumnError = fixedSQL.match(
		/column reference "([^"]+)" is ambiguous/i
	);
	if (ambiguousColumnError) {
		const ambiguousColumn = ambiguousColumnError[1];
		console.error(
			`SQL Error: Column reference "${ambiguousColumn}" is ambiguous`
		);

		// Try to fix by qualifying the column with the appropriate table
		if (ambiguousColumn === "id") {
			if (/FROM\s+doctors/i.test(fixedSQL)) {
				fixedSQL = fixedSQL.replace(/\bid\b(?!\.)/, "doctors.id");
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			} else if (/FROM\s+patients/i.test(fixedSQL)) {
				fixedSQL = fixedSQL.replace(/\bid\b(?!\.)/, "patients.id");
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			}
		} else if (ambiguousColumn === "name") {
			if (/FROM\s+doctors/i.test(fixedSQL)) {
				fixedSQL = fixedSQL.replace(/\bname\b(?!\.)/, "doctors.name");
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			} else if (/FROM\s+organizations/i.test(fixedSQL)) {
				fixedSQL = fixedSQL.replace(
					/\bname\b(?!\.)/,
					"organizations.name"
				);
				console.log("Fixed SQL:", fixedSQL);
				return fixedSQL;
			}
		}

		return `Error: Column reference "${ambiguousColumn}" is ambiguous. Please qualify this column with the appropriate table name.`;
	}

	// If no errors were found, return the original (trimmed) SQL
	return fixedSQL;
}
