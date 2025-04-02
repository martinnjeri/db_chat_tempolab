import { GemmaService } from "./gemmaService";
import { DatabaseTable } from "@/types/database";

export class NLPProcessor {
	public gemmaService: GemmaService;
	private tables: DatabaseTable[];
	private tableMap: Map<string, DatabaseTable>;
	private synonyms: Map<string, string[]>;

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

			// Generate a query based on the detected table
			const tableName = detectedTables[0];

			// Special handling for doctors table to include organization name
			if (tableName.toLowerCase() === "doctors") {
				return `SELECT doctors.*, organizations.name as organization_name
				FROM doctors
				LEFT JOIN organizations ON doctors.organization_id = organizations.id
				LIMIT 10`;
			}

			// Default query for other tables
			return `SELECT * FROM ${tableName} LIMIT 10`;
		}
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

	private detectTables(query: string): string[] {
		const lowercaseQuery = query.toLowerCase();
		const detectedTables: string[] = [];

		// Check for table names in the query
		for (const [tableName, table] of this.tableMap.entries()) {
			if (lowercaseQuery.includes(tableName)) {
				detectedTables.push(table.name);
			}
		}

		return detectedTables;
	}
}
