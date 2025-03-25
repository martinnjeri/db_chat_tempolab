"use client";

import React, { useState, useEffect } from "react";
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

	// Initialize NLP processor when tables are loaded
	useEffect(() => {
		if (tables.length > 0) {
			setNlpProcessor(new NLPProcessor(tables));
		}
	}, [tables]);

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

			// Process the natural language query
			let generatedSql = "";
			try {
				generatedSql = nlpProcessor.processQuery(queryText);
			} catch (nlpError: any) {
				throw new Error(`Failed to process query: ${nlpError.message}`);
			}

			setSql(generatedSql);

			// Execute the SQL query using Supabase
			try {
				const { data, error: queryError } = await supabase.rpc(
					"execute_sql",
					{
						sql_query: generatedSql,
					}
				);

				if (queryError) {
					throw new Error(
						`Query execution error: ${queryError.message}`
					);
				}

				if (!data) {
					throw new Error("No data returned from query");
				}

				// Determine result type based on the query and data
				let resultFormat: "table" | "list" | "value" = "table";
				if (generatedSql.toLowerCase().includes("count(*)")) {
					resultFormat = "value";
				} else if (
					Array.isArray(data) &&
					data.length === 1 &&
					Object.keys(data[0]).length === 1
				) {
					resultFormat = "value";
				}

				setResultType(resultFormat);
				setResults(data);
			} catch (queryErr: any) {
				console.error("SQL execution error:", queryErr);
				throw new Error(`Failed to execute SQL: ${queryErr.message}`);
			}
		} catch (err: any) {
			setError(
				err.message || "Failed to process query. Please try again."
			);
			console.error("Error processing query:", err);
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
							/>
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
