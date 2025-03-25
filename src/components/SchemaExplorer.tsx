"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Database, Table, AlignJustify, Loader2 } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseClient";
import { DatabaseTable } from "@/types/database";

interface TableColumn {
	name: string;
	type: string;
	isPrimary?: boolean;
	isForeign?: boolean;
}

interface SchemaExplorerProps {
	highlightedTable?: string;
	onTableSelect?: (tableName: string) => void;
	onTablesLoaded?: (tables: DatabaseTable[]) => void;
}

export default function SchemaExplorer({
	highlightedTable = "",
	onTableSelect = () => {},
	onTablesLoaded = () => {},
}: SchemaExplorerProps) {
	const [tables, setTables] = useState<DatabaseTable[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedTables, setExpandedTables] = useState<string[]>([]);

	useEffect(() => {
		async function fetchDatabaseSchema() {
			try {
				setLoading(true);
				setError(null);

				// First check if we can connect to Supabase
				try {
					const { data: connectionTest, error: connectionError } =
						await supabase.rpc("execute_sql", {
							sql_query: "SELECT 1 as connected;",
						});

					if (connectionError) {
						throw new Error(
							`Connection test failed: ${connectionError.message}`
						);
					}

					if (!connectionTest || connectionTest.length === 0) {
						throw new Error(
							"Connection test returned empty result"
						);
					}
				} catch (connErr: any) {
					console.error("Supabase connection error:", connErr);
					throw new Error(
						`Database connection error: ${connErr.message}`
					);
				}

				// Fetch table information from Supabase with better error handling
				const { data: tablesData, error: tablesError } =
					await supabase.rpc("execute_sql", {
						sql_query: `
            SELECT 
              table_name as name
            FROM 
              information_schema.tables 
            WHERE 
              table_schema = 'public' AND 
              table_type = 'BASE TABLE'
            ORDER BY 
              table_name
          `,
					});

				if (tablesError) {
					throw new Error(
						`Failed to fetch tables: ${tablesError.message}`
					);
				}

				if (!tablesData || tablesData.length === 0) {
					setTables([]);
					setError(
						"No tables found in the database. Make sure your migrations have been applied."
					);
					setLoading(false);
					return;
				}

				// For each table, fetch its columns with better error handling
				const tablesWithColumns = await Promise.all(
					tablesData.map(async (table: { name: string }) => {
						try {
							const { data: columnsData, error: columnsError } =
								await supabase.rpc("execute_sql", {
									sql_query: `
                SELECT 
                  column_name as name, 
                  data_type as type,
                  CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
                  CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign
                FROM 
                  information_schema.columns c
                LEFT JOIN (
                  SELECT 
                    kcu.column_name 
                  FROM 
                    information_schema.table_constraints tc
                  JOIN 
                    information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                  WHERE 
                    tc.constraint_type = 'PRIMARY KEY' AND 
                    tc.table_name = '${table.name}'
                ) pk ON c.column_name = pk.column_name
                LEFT JOIN (
                  SELECT 
                    kcu.column_name 
                  FROM 
                    information_schema.table_constraints tc
                  JOIN 
                    information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                  WHERE 
                    tc.constraint_type = 'FOREIGN KEY' AND 
                    tc.table_name = '${table.name}'
                ) fk ON c.column_name = fk.column_name
                WHERE 
                  c.table_name = '${table.name}' AND 
                  c.table_schema = 'public'
                ORDER BY 
                  ordinal_position
              `,
								});

							if (columnsError) {
								console.warn(
									`Error fetching columns for ${table.name}:`,
									columnsError
								);
								return {
									name: table.name,
									columns: [],
									error: columnsError.message,
								};
							}

							// Handle the case where columnsData might be a single object or null
							const columnsArray = Array.isArray(columnsData)
								? columnsData
								: columnsData
									? [columnsData]
									: [];

							const columns = columnsArray.map((col: any) => ({
								name: col.name,
								type: col.type,
								isPrimary: col.is_primary,
								isForeign: col.is_foreign,
							}));

							return {
								name: table.name,
								columns,
							};
						} catch (columnErr: any) {
							console.error(
								`Error processing columns for ${table.name}:`,
								columnErr
							);
							return {
								name: table.name,
								columns: [],
								error: columnErr.message,
							};
						}
					})
				);

				setTables(tablesWithColumns);
				onTablesLoaded(tablesWithColumns);
			} catch (err: any) {
				console.error("Error fetching schema:", err);
				setError(err.message);
				// Set empty tables in case of error
				setTables([]);
			} finally {
				setLoading(false);
			}
		}

		// Fetch schema with retry mechanism
		let retryCount = 0;
		const maxRetries = 2;

		const attemptFetch = () => {
			fetchDatabaseSchema().catch((err) => {
				console.error(
					`Schema fetch attempt ${retryCount + 1} failed:`,
					err
				);
				if (retryCount < maxRetries) {
					retryCount++;
					setTimeout(attemptFetch, 1500); // Wait 1.5 seconds before retrying
				}
			});
		};

		attemptFetch();
	}, [onTablesLoaded]);

	const toggleTable = (tableName: string) => {
		setExpandedTables((prev) =>
			prev.includes(tableName)
				? prev.filter((t) => t !== tableName)
				: [...prev, tableName]
		);
		onTableSelect(tableName);
	};

	const renderLoading = () => (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">
					Loading schema...
				</p>
			</div>
		</div>
	);

	const renderError = () => (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center space-y-4">
				<Database className="h-8 w-8 text-destructive" />
				<p className="text-sm text-destructive">{error}</p>
			</div>
		</div>
	);

	const renderEmpty = () => (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center space-y-4">
				<Table className="h-8 w-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">No tables found</p>
			</div>
		</div>
	);

	return (
		<div className="w-full h-full bg-background border-r">
			<div className="p-4 border-b">
				<h2 className="text-lg font-semibold flex items-center gap-2">
					<Database className="h-5 w-5" />
					Schema Explorer
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{loading
						? "Loading schema..."
						: `${tables.length} tables available`}
				</p>
			</div>

			<ScrollArea className="h-[calc(100%-4rem)]">
				<div className="p-2">
					{loading ? (
						renderLoading()
					) : error ? (
						renderError()
					) : tables.length === 0 ? (
						renderEmpty()
					) : (
						<TooltipProvider>
							<Accordion
								type="multiple"
								value={expandedTables}
								className="w-full">
								{tables.map((table) => (
									<AccordionItem
										key={table.name}
										value={table.name}
										className={cn(
											"border rounded-md mb-2",
											highlightedTable === table.name &&
												"border-primary bg-primary/5"
										)}>
										<AccordionTrigger
											onClick={() =>
												toggleTable(table.name)
											}
											className={cn(
												"px-3 hover:no-underline",
												highlightedTable ===
													table.name &&
													"text-primary font-medium"
											)}>
											<div className="flex items-center gap-2">
												<Table className="h-4 w-4" />
												<span>{table.name}</span>
											</div>
										</AccordionTrigger>
										<AccordionContent className="px-3 pb-2">
											<div className="space-y-1">
												{table.columns.map((column) => (
													<Tooltip key={column.name}>
														<TooltipTrigger asChild>
															<div
																className={cn(
																	"flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted",
																	column.isPrimary &&
																		"font-medium"
																)}>
																<div className="flex items-center gap-2">
																	<AlignJustify className="h-3.5 w-3.5" />
																	<span
																		className={
																			column.isPrimary
																				? "text-primary"
																				: ""
																		}>
																		{
																			column.name
																		}
																	</span>
																</div>
																<span className="text-xs text-muted-foreground">
																	{
																		column.type
																	}
																</span>
															</div>
														</TooltipTrigger>
														<TooltipContent side="right">
															<div>
																<div className="font-medium">
																	{
																		column.name
																	}
																</div>
																<div className="text-xs">
																	Type:{" "}
																	{
																		column.type
																	}
																</div>
																{column.isPrimary && (
																	<div className="text-xs text-primary">
																		Primary
																		Key
																	</div>
																)}
																{column.isForeign && (
																	<div className="text-xs text-blue-500">
																		Foreign
																		Key
																	</div>
																)}
															</div>
														</TooltipContent>
													</Tooltip>
												))}
											</div>
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</TooltipProvider>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
