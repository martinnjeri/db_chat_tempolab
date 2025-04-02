"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import SchemaExplorer from "./SchemaExplorer";
import QueryInputArea from "./QueryInputArea";
import SqlPreview from "./SqlPreview";
import ResultsDisplay from "./ResultsDisplay";
import { supabase } from "@/lib/supabaseClient";
import { NLPProcessor } from "@/lib/nlpProcessor";
import { DatabaseTable } from "@/types/database";

interface QueryInterfaceProps {
	initialQuery?: string;
}

interface QueryResult {
	data: any[] | null;
	error: any;
}

export default function QueryInterface({
	initialQuery = "",
}: QueryInterfaceProps) {
	const [query, setQuery] = useState<string>(initialQuery);
	const [sql, setSql] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [highlightedTable, setHighlightedTable] = useState<string>("");
	const [results, setResults] = useState<any[] | null>(null);
	const [resultType, setResultType] = useState<
		"table" | "list" | "value" | "empty"
	>("empty");
	const [error, setError] = useState<string | null>(null);
	const [tables, setTables] = useState<DatabaseTable[]>([]);
	const [nlpProcessor, setNlpProcessor] = useState<NLPProcessor | null>(null);
	const [explanation, setExplanation] = useState<string>("");
	const [context, setContext] = useState<string>("");
	// For responsive layout
	const [isMobile, setIsMobile] = useState<boolean>(false);

	// Check for mobile view
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		// Initial check
		checkMobile();

		// Add event listener
		window.addEventListener("resize", checkMobile);

		// Cleanup
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Initialize NLP processor when tables are loaded
	useEffect(() => {
		if (tables.length > 0) {
			const processor = new NLPProcessor(tables);
			setNlpProcessor(processor);

			// Check if Gemini is configured
			if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
				setError(
					"Warning: Gemini API key not configured. Using fallback approach."
				);
			}
		}
	}, [tables]);

	const executeQuery = async (sqlQuery: string): Promise<QueryResult> => {
		try {
			// Remove trailing semicolons which cause issues with the execute_sql function
			const cleanedQuery = sqlQuery.replace(/;$/, "");

			const { data, error } = await supabase.rpc("execute_sql", {
				sql_query: cleanedQuery,
				org_id: null,
			});

			console.log("executeQuery - data:", data);
			console.log("executeQuery - error:", error);

			if (error) throw error;

			// Check if data contains an error object from the function
			if (data && data.error) {
				return { data: null, error: { message: data.error } };
			}

			return { data, error: null };
		} catch (error: any) {
			console.error("Query execution error:", error);
			return { data: null, error };
		}
	};

	const setQueryResults = (result: QueryResult) => {
		if (result.error) {
			setError(result.error.message);
			return;
		}

		if (!result.data || result.data.length === 0) {
			setResults(null);
			setResultType("empty");
			return;
		}

		setResults(result.data);

		// Determine result type
		if (Array.isArray(result.data)) {
			if (
				result.data.length === 1 &&
				Object.keys(result.data[0]).length === 1
			) {
				setResultType("value");
			} else {
				setResultType("table");
			}
		} else {
			setResultType("value");
		}
	};

	const setQueryExplanation = (text: string) => {
		setExplanation(text);
	};

	// Add this function to generate context
	const generateQueryContext = async (queryText: string) => {
		if (!nlpProcessor) return "";

		try {
			// Use the Gemma service to generate context
			const queryContext =
				await nlpProcessor.gemmaService.generateQueryContext(queryText);
			return queryContext;
		} catch (error) {
			console.warn("Failed to generate query context:", error);
			return `You asked about ${queryText}`;
		}
	};

	const handleSubmitQuery = async (queryText: string) => {
		setQuery(queryText);
		setIsProcessing(true);
		setError(null);

		try {
			if (!nlpProcessor) {
				throw new Error(
					"Database schema not loaded yet. Please try again."
				);
			}

			// Generate context for what the model understood
			try {
				const queryContext = await generateQueryContext(queryText);
				setContext(queryContext);
			} catch (contextError) {
				console.warn("Failed to generate context:", contextError);
			}

			// Process the natural language query
			let generatedSql = "";
			try {
				generatedSql = await nlpProcessor.processQuery(queryText);
			} catch (nlpError: any) {
				throw new Error(`Failed to process query: ${nlpError.message}`);
			}

			setSql(generatedSql);

			// Execute the SQL query
			try {
				const result = await executeQuery(generatedSql);
				setQueryResults(result);

				// Get explanation
				try {
					const explanation = await nlpProcessor.explainQuery(
						queryText,
						generatedSql
					);
					if (typeof explanation === "string") {
						setQueryExplanation(explanation);
					}
				} catch (explainError) {
					console.warn(
						"Failed to generate query explanation:",
						explainError
					);
				}
			} catch (dbError: any) {
				throw new Error(`Database error: ${dbError.message}`);
			}
		} catch (error: any) {
			setError(error.message);
			console.error("Query error:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleTableSelect = (tableName: string) => {
		setHighlightedTable(tableName);
		// Generate a sample query for the selected table
		const sampleQuery = `Show me all ${tableName}`;
		setQuery(sampleQuery);
	};

	// For mobile view, we'll use a different layout
	if (isMobile) {
		return (
			<div className="w-full h-full bg-background flex flex-col overflow-auto">
				{/* Mobile Layout */}
				<div className="flex flex-col h-full p-4 gap-4">
					{/* Query Input Area */}
					<div className="w-full">
						<QueryInputArea
							onSubmitQuery={handleSubmitQuery}
							isProcessing={isProcessing}
						/>
					</div>

					{/* SQL Preview */}
					<div className="w-full">
						<SqlPreview
							sql={sql}
							isLoading={isProcessing}
							error={error || ""}
						/>
					</div>

					{/* Schema Explorer (Collapsible on mobile) */}
					<details className="w-full border rounded-md">
						<summary className="p-3 font-medium cursor-pointer bg-muted">
							Database Schema
						</summary>
						<div className="p-3 h-[300px] overflow-auto">
							<SchemaExplorer
								highlightedTable={highlightedTable}
								onTableSelect={handleTableSelect}
								onTablesLoaded={setTables}
							/>
						</div>
					</details>

					{/* Results Display */}
					<div className="w-full flex-1">
						<ResultsDisplay
							results={results}
							error={error}
							loading={isProcessing}
							resultType={resultType}
							explanation={explanation}
							context={context}
						/>
					</div>
				</div>
			</div>
		);
	}

	// Desktop layout with resizable panels
	return (
		<div className="w-full h-full bg-background flex flex-col">
			<ResizablePanelGroup direction="horizontal" className="h-full">
				{/* Schema Explorer Panel */}
				<ResizablePanel
					defaultSize={20}
					minSize={15}
					maxSize={30}
					className="h-full">
					<SchemaExplorer
						highlightedTable={highlightedTable}
						onTableSelect={handleTableSelect}
						onTablesLoaded={setTables}
					/>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Main Content Panel */}
				<ResizablePanel defaultSize={80} className="h-full">
					<div className="flex flex-col h-full p-4 gap-4">
						{/* Query Input Area */}
						<div className="w-full">
							<QueryInputArea
								onSubmitQuery={handleSubmitQuery}
								isProcessing={isProcessing}
							/>
						</div>

						{/* SQL Preview */}
						<div className="w-full h-[150px]">
							<SqlPreview
								sql={sql}
								isLoading={isProcessing}
								error={error || ""}
							/>
						</div>

						{/* Results Display */}
						<div className="w-full flex-1">
							<ResultsDisplay
								results={results}
								error={error}
								loading={isProcessing}
								resultType={resultType}
								explanation={explanation}
								context={context}
							/>
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
