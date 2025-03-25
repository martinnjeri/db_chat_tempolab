import { GoogleGenerativeAI } from "@google/generative-ai";
import { DatabaseColumn } from "@/types/database";

export class GemmaService {
	private genAI: GoogleGenerativeAI | null = null;
	private model: any;
	private apiKey: string;
	private isConfigured: boolean = false;

	constructor() {
		// Check for API key in environment variables
		this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

		// Debug log to check if API key is available
		console.log("API Key available:", !!this.apiKey);

		this.isConfigured = !!this.apiKey;

		if (this.isConfigured) {
			try {
				this.genAI = new GoogleGenerativeAI(this.apiKey);
				// Use Gemini model
				this.model = this.genAI.getGenerativeModel({
					model: "gemini-1.5-flash",
				});
				console.log("Gemini model initialized successfully");
			} catch (error) {
				console.error("Failed to initialize Gemini:", error);
				this.isConfigured = false;
			}
		} else {
			throw new Error(
				"Gemini API key not configured. Please set the NEXT_PUBLIC_GEMINI_API_KEY environment variable."
			);
		}
	}

	public async translateToSQL(
		naturalLanguageQuery: string,
		databaseSchema: any
	): Promise<string> {
		if (!this.isConfigured) {
			return Promise.reject("Gemini API is not configured");
		}

		try {
			// Create a detailed schema representation for the model
			const schemaContext = this.createSchemaContext(databaseSchema);

			const prompt = `
				You are a SQL query generator. Convert the following natural language query to SQL.
				
				Database Schema:
				${schemaContext}
				
				Natural Language Query: "${naturalLanguageQuery}"
				
				Return only the SQL query without any explanation or markdown formatting.
			`;

			const result = await this.model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();

			// Clean up the response to extract just the SQL
			return this.cleanSQLResponse(text);
		} catch (error) {
			console.error("Gemini translation error:", error);
			throw error;
		}
	}

	private cleanSQLResponse(text: string): string {
		// Remove markdown code blocks if present
		let sql = text
			.replace(/```sql/g, "")
			.replace(/```/g, "")
			.trim();

		// Remove any explanatory text before or after the SQL
		if (sql.toLowerCase().includes("select")) {
			const selectIndex = sql.toLowerCase().indexOf("select");
			sql = sql.substring(selectIndex);

			// Ensure the SQL ends with a semicolon
			if (!sql.trim().endsWith(";")) {
				sql += ";";
			}
		}

		return sql;
	}

	public async explainSQL(sqlQuery: string): Promise<string> {
		if (!this.isConfigured) {
			return Promise.reject("Gemini API is not configured");
		}

		try {
			const prompt = `
				Explain the following SQL query in simple terms:
				
				SQL Query: ${sqlQuery}
				
				Provide a concise explanation that a non-technical person would understand.
			`;

			const result = await this.model.generateContent(prompt);
			const response = await result.response;
			return response.text();
		} catch (error) {
			console.error("Gemini explanation error:", error);
			throw error;
		}
	}

	private createSchemaContext(databaseSchema: any): string {
		if (!databaseSchema || !Array.isArray(databaseSchema)) {
			return "No schema information available";
		}

		let context = "Tables in the database:\n\n";

		databaseSchema.forEach((table) => {
			context += `Table: ${table.name}\n`;
			context += "Columns:\n";

			if (table.columns && Array.isArray(table.columns)) {
				table.columns.forEach((column: DatabaseColumn) => {
					let columnDesc = `- ${column.name} (${column.type})`;
					if (column.isPrimaryKey) columnDesc += " PRIMARY KEY";
					if (column.isNullable === false) columnDesc += " NOT NULL";
					context += columnDesc + "\n";
				});
			}

			// Add foreign key information if available
			if (table.foreignKeys && Array.isArray(table.foreignKeys)) {
				context += "Foreign Keys:\n";
				table.foreignKeys.forEach(
					(fk: {
						column: string;
						foreignTable: string;
						foreignColumn: string;
					}) => {
						context += `- ${fk.column} references ${fk.foreignTable}.${fk.foreignColumn}\n`;
					}
				);
			}

			context += "\n";
		});

		return context;
	}
}
