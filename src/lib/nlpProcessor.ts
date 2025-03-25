import { DatabaseTable, DatabaseColumn } from "@/types/database";
import { GemmaService } from "./gemmaService";

// Add a console log to check if the import is working
// console.log("GemmaService imported:", GemmaService);

interface QueryIntent {
	type:
		| "select"
		| "count"
		| "group"
		| "filter"
		| "sort"
		| "join"
		| "aggregate";
	table: string;
	columns?: string[];
	conditions?: {
		field: string;
		operator: string;
		value: string | number;
	}[];
	groupBy?: string[];
	orderBy?: {
		field: string;
		direction: "asc" | "desc";
	}[];
	joins?: {
		table: string;
		condition: string;
		type: "inner" | "left" | "right" | "full";
	}[];
	limit?: number;
	offset?: number;
	aggregate?: {
		function: "count" | "sum" | "avg" | "min" | "max";
		field: string;
		alias?: string;
	}[];
}

export interface QueryExplanation {
	action: string;
	tables: string[];
	filters?: string[];
	grouping?: string[];
	sorting?: string[];
	limit?: number;
	joins?: string[];
}

export class NLPProcessor {
	private tables: DatabaseTable[];
	private tableMap: Map<string, DatabaseTable>;
	private synonyms: Map<string, string[]>;
	private gemmaService: GemmaService;

	constructor(tables: DatabaseTable[]) {
		this.tables = tables;
		this.tableMap = new Map();
		this.synonyms = new Map();

		// Initialize the table map for quick lookups
		for (const table of tables) {
			if (table && table.name) {
				this.tableMap.set(table.name.toLowerCase(), table);
			}
		}

		// Initialize the Gemma service with debug logging
		console.log("Initializing GemmaService...");
		this.gemmaService = new GemmaService();
		console.log("GemmaService initialized:", this.gemmaService);
	}

	public async processQuery(query: string): Promise<string> {
		try {
			// Add debug logging
			console.log("GemmaService instance:", this.gemmaService);
			console.log(
				"Available methods:",
				Object.getOwnPropertyNames(
					Object.getPrototypeOf(this.gemmaService)
				)
			);

			// Try to use Gemma to generate SQL
			const generatedSql = await this.gemmaService.translateToSQL(
				query,
				this.tables
			);
			return generatedSql;
		} catch (error) {
			console.error(
				"Gemma SQL generation failed, falling back to rule-based approach",
				error
			);

			// Fall back to rule-based approach
			const detectedTables = this.detectTables(query);

			if (detectedTables.length === 0) {
				throw new Error("Could not identify any tables in your query");
			}

			// Use the first detected table
			const primaryTable = detectedTables[0];
			const columns = this.detectColumns(query, primaryTable);
			const conditions = this.detectConditions(query, primaryTable);
			const limit = this.detectLimit(query);
			const orderBy = this.detectSorting(query, primaryTable);

			// Generate SQL
			let sql = `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${primaryTable}"`;

			if (conditions.length > 0) {
				sql += ` WHERE ${conditions
					.map(
						(c) =>
							`"${c.field}" ${c.operator} ${typeof c.value === "string" ? `'${c.value}'` : c.value}`
					)
					.join(" AND ")}`;
			}

			if (orderBy.length > 0) {
				sql += ` ORDER BY ${orderBy
					.map((o) => `"${o.field}" ${o.direction}`) // Fixed ordering syntax
					.join(", ")}`; // Replaced extraneous comment with accurate one
			}

			if (limit !== null) {
				sql += ` LIMIT ${limit}`;
			}

			return sql;
		}
	}

	public detectTables(query: string): string[] {
		if (!query || typeof query !== "string") {
			throw new Error("Invalid query: Query must be a non-empty string");
		}

		const detectedTables: string[] = [];
		const queryLower = query.toLowerCase();

		// Check each table name in the query
		for (const [tableName, _] of this.tableMap) {
			// Check if the table name appears in the query
			if (queryLower.includes(tableName)) {
				detectedTables.push(tableName);
			}
		}

		// If no tables were detected but we have tables in our schema,
		// try to detect tables based on column names
		if (detectedTables.length === 0 && this.tableMap.size > 0) {
			const tablesWithMatchingColumns = new Map<string, number>();

			// For each table, check if any of its columns are mentioned in the query
			for (const [tableName, tableSchema] of this.tableMap) {
				let matchCount = 0;
				for (const column of tableSchema.columns) {
					if (
						column &&
						column.name &&
						queryLower.includes(column.name.toLowerCase())
					) {
						matchCount++;
					}
				}

				if (matchCount > 0) {
					tablesWithMatchingColumns.set(tableName, matchCount);
				}
			}

			// Sort tables by the number of column matches (descending)
			const sortedTables = Array.from(tablesWithMatchingColumns.entries())
				.sort((a, b) => b[1] - a[1])
				.map((entry) => entry[0]);

			detectedTables.push(...sortedTables);
		}

		// If still no tables detected, return the first table as a fallback
		if (detectedTables.length === 0 && this.tableMap.size > 0) {
			detectedTables.push(Array.from(this.tableMap.keys())[0]);
		}

		return detectedTables;
	}

	// Helper method to detect a single table (used in some places)
	public detectTable(query: string): string | null {
		const tables = this.detectTables(query);
		return tables.length > 0 ? tables[0] : null;
	}

	private detectColumns(query: string, table: string): string[] {
		if (!query || typeof query !== "string") {
			throw new Error("Invalid query: Query must be a non-empty string");
		}

		const tableSchema = this.tableMap.get(table.toLowerCase());
		if (!tableSchema || !tableSchema.columns) {
			return [];
		}

		const queryLower = query.toLowerCase();
		const columns: string[] = [];
		const columnMentions = new Map<string, number>();

		// Check for "all" or "*" keywords
		if (
			queryLower.includes("all") ||
			queryLower.includes("everything") ||
			queryLower.includes("*")
		) {
			return tableSchema.columns.map((column) => column.name);
		}

		// Check each column name in the query
		for (const column of tableSchema.columns) {
			if (!column || !column.name) continue;

			const columnLower = column.name.toLowerCase();
			if (queryLower.includes(columnLower)) {
				columnMentions.set(
					column.name,
					(columnMentions.get(column.name) || 0) + 1
				);
			}
		}

		// Add columns that were mentioned, sorted by mention count
		const sortedColumns = Array.from(columnMentions.entries())
			.sort((a, b) => b[1] - a[1])
			.map((entry) => entry[0]);

		columns.push(...sortedColumns);

		// If no specific columns mentioned, return all columns
		return columns.length > 0
			? columns
			: tableSchema.columns
					.filter((column: DatabaseColumn) => column && column.name)
					.map((column: DatabaseColumn) => column.name);
	}

	private detectConditions(
		query: string,
		table: string
	): { field: string; operator: string; value: string | number }[] {
		if (!query || typeof query !== "string") {
			throw new Error("Invalid query: Query must be a non-empty string");
		}

		const conditions: {
			field: string;
			operator: string;
			value: string | number;
		}[] = [];
		const tableSchema = this.tableMap.get(table.toLowerCase());
		if (!tableSchema || !tableSchema.columns) return conditions;

		const queryLower = query.toLowerCase();

		// Simple condition detection - this is a basic implementation
		// In a real system, you'd want more sophisticated NLP here
		for (const column of tableSchema.columns) {
			if (!column || !column.name) continue;

			const columnLower = column.name.toLowerCase();
			if (queryLower.includes(columnLower)) {
				// Look for patterns like "where X = Y" or "X equals Y"
				const equalsPattern = new RegExp(
					`${columnLower}\\s*(=|equals|is)\\s*([\\w\\d]+)`,
					"i"
				);
				const equalsMatch = queryLower.match(equalsPattern);

				if (equalsMatch && equalsMatch[2]) {
					conditions.push({
						field: column.name,
						operator: "=",
						value: isNaN(Number(equalsMatch[2]))
							? equalsMatch[2]
							: Number(equalsMatch[2]),
					});
				}
			}
		}

		return conditions;
	}

	private detectLimit(query: string): number | null {
		if (!query || typeof query !== "string") {
			throw new Error("Invalid query: Query must be a non-empty string");
		}

		const limitPattern = /limit\s*(\d+)/i;
		const match = query.match(limitPattern);

		if (match && match[1]) {
			return Number(match[1]);
		}

		return null;
	}

	private detectSorting(
		query: string,
		table: string
	): { field: string; direction: "asc" | "desc" }[] {
		if (!query || typeof query !== "string") {
			throw new Error("Invalid query: Query must be a non-empty string");
		}

		const sorting: { field: string; direction: "asc" | "desc" }[] = [];
		const tableSchema = this.tableMap.get(table.toLowerCase());
		if (!tableSchema || !tableSchema.columns) return sorting;

		const queryLower = query.toLowerCase();

		// Check for sorting patterns
		const ascendingPattern = /order\s*by\s*([^\s]+)\s*asc/i;
		const descendingPattern = /order\s*by\s*([^\s]+)\s*desc/i;

		// Check for ascending sorting
		const ascendingMatch = queryLower.match(ascendingPattern);
		if (ascendingMatch && ascendingMatch[1]) {
			sorting.push({
				field: ascendingMatch[1],
				direction: "asc",
			});
		}

		// Check for descending sorting
		const descendingMatch = queryLower.match(descendingPattern);
		if (descendingMatch && descendingMatch[1]) {
			sorting.push({
				field: descendingMatch[1],
				direction: "desc",
			});
		}

		// If no sorting specified, use default sorting
		if (sorting.length === 0 && tableSchema.columns.length > 0) {
			sorting.push({
				field: tableSchema.columns[0].name,
				direction: "asc",
			});
		}

		return sorting;
	}

	public async explainQuery(query: string, sql: string): Promise<string> {
		try {
			// Try to get an explanation from Gemma
			const gemmaExplanation = await this.gemmaService.explainSQL(sql);
			return gemmaExplanation;
		} catch (error) {
			console.error(
				"Gemma explanation failed, falling back to rule-based approach",
				error
			);

			// Fall back to a simple explanation
			const detectedTables = this.detectTables(query);
			const explanation = `This query retrieves data from the ${detectedTables.join(", ")} table(s).`;

			return explanation;
		}
	}
}
