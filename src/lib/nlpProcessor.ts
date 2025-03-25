import { DatabaseTable } from "@/types/database";

interface QueryIntent {
	type: "select" | "count" | "group" | "filter" | "sort" | "join";
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
}

export class NLPProcessor {
	private tables: DatabaseTable[];

	constructor(tables: DatabaseTable[]) {
		this.tables = tables;
	}

	private detectTable(query: string): string | null {
		const queryLower = query.toLowerCase();
		for (const table of this.tables) {
			if (queryLower.includes(table.name.toLowerCase())) {
				return table.name;
			}
		}
		return null;
	}

	private detectColumns(query: string, table: string): string[] {
		const tableSchema = this.tables.find((t) => t.name === table);
		if (!tableSchema) return [];

		const queryLower = query.toLowerCase();
		const columns: string[] = [];

		// Check for specific column mentions
		for (const column of tableSchema.columns) {
			if (queryLower.includes(column.name.toLowerCase())) {
				columns.push(column.name);
			}
		}

		// If no specific columns mentioned, return all columns
		return columns.length > 0
			? columns
			: tableSchema.columns.map((c) => c.name);
	}

	private detectConditions(
		query: string,
		table: string
	): { field: string; operator: string; value: string | number }[] {
		const conditions: {
			field: string;
			operator: string;
			value: string | number;
		}[] = [];
		const tableSchema = this.tables.find((t) => t.name === table);
		if (!tableSchema) return conditions;

		// Common condition patterns
		const patterns = [
			{
				regex: /(\w+)\s+(?:is|equals|equal to)\s+['"]?([^'"]+)['"]?/i,
				operator: "=",
			},
			{
				regex: /(\w+)\s+(?:greater than|more than)\s+['"]?([^'"]+)['"]?/i,
				operator: ">",
			},
			{
				regex: /(\w+)\s+(?:less than|smaller than)\s+['"]?([^'"]+)['"]?/i,
				operator: "<",
			},
			{
				regex: /(\w+)\s+(?:contains|has)\s+['"]?([^'"]+)['"]?/i,
				operator: "LIKE",
			},
		];

		for (const pattern of patterns) {
			const matches = query.match(pattern.regex);
			if (matches) {
				const [, field, value] = matches;
				if (
					tableSchema.columns.some(
						(c) => c.name.toLowerCase() === field.toLowerCase()
					)
				) {
					conditions.push({
						field,
						operator: pattern.operator,
						value:
							pattern.operator === "LIKE" ? `%${value}%` : value,
					});
				}
			}
		}

		return conditions;
	}

	private detectGrouping(query: string, table: string): string[] {
		const groupBy: string[] = [];
		const tableSchema = this.tables.find((t) => t.name === table);
		if (!tableSchema) return groupBy;

		const queryLower = query.toLowerCase();
		if (
			queryLower.includes("group by") ||
			queryLower.includes("grouped by")
		) {
			for (const column of tableSchema.columns) {
				if (queryLower.includes(column.name.toLowerCase())) {
					groupBy.push(column.name);
				}
			}
		}

		return groupBy;
	}

	private detectSorting(
		query: string,
		table: string
	): { field: string; direction: "asc" | "desc" }[] {
		const orderBy: { field: string; direction: "asc" | "desc" }[] = [];
		const tableSchema = this.tables.find((t) => t.name === table);
		if (!tableSchema) return orderBy;

		const queryLower = query.toLowerCase();
		if (queryLower.includes("sort") || queryLower.includes("order")) {
			for (const column of tableSchema.columns) {
				if (queryLower.includes(column.name.toLowerCase())) {
					orderBy.push({
						field: column.name,
						direction: queryLower.includes("desc") ? "desc" : "asc",
					});
				}
			}
		}

		return orderBy;
	}

	private generateSQL(intent: QueryIntent): string {
		let sql = "SELECT ";

		// Add columns
		if (intent.columns && intent.columns.length > 0) {
			sql += intent.columns.join(", ");
		} else {
			sql += "*";
		}

		// Add FROM clause
		sql += ` FROM ${intent.table}`;

		// Add JOINs if any
		if (intent.joins && intent.joins.length > 0) {
			for (const join of intent.joins) {
				sql += ` ${join.type.toUpperCase()} JOIN ${join.table} ON ${join.condition}`;
			}
		}

		// Add WHERE conditions
		if (intent.conditions && intent.conditions.length > 0) {
			sql +=
				" WHERE " +
				intent.conditions
					.map(
						(condition) =>
							`${condition.field} ${condition.operator} ${
								typeof condition.value === "string"
									? `'${condition.value}'`
									: condition.value
							}`
					)
					.join(" AND ");
		}

		// Add GROUP BY
		if (intent.groupBy && intent.groupBy.length > 0) {
			sql += " GROUP BY " + intent.groupBy.join(", ");
		}

		// Add ORDER BY
		if (intent.orderBy && intent.orderBy.length > 0) {
			sql +=
				" ORDER BY " +
				intent.orderBy
					.map((order) => `${order.field} ${order.direction}`)
					.join(", ");
		}

		return sql + ";";
	}

	public processQuery(query: string): string {
		// Detect query intent
		const intent: QueryIntent = {
			type: "select",
			table: "",
			columns: [],
			conditions: [],
			groupBy: [],
			orderBy: [],
		};

		// Detect table
		const table = this.detectTable(query);
		if (!table) {
			throw new Error("Could not detect table from query");
		}
		intent.table = table;

		// Detect columns
		intent.columns = this.detectColumns(query, table);

		// Detect conditions
		intent.conditions = this.detectConditions(query, table);

		// Detect grouping
		intent.groupBy = this.detectGrouping(query, table);

		// Detect sorting
		intent.orderBy = this.detectSorting(query, table);

		// Generate SQL
		return this.generateSQL(intent);
	}
}
