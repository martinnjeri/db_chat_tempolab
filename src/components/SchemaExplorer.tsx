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

				// First check if we can connect to Supabase using a simpler method
				try {
					const { data: authData, error: authError } =
						await supabase.auth.getSession();

					if (authError) {
						throw new Error(
							`Connection test failed: ${authError.message}`
						);
					}
				} catch (connErr: any) {
					console.error("Supabase connection error:", connErr);
					throw new Error(
						`Database connection error: ${connErr.message}`
					);
				}

				// Use the execute_sql function with proper error handling
				try {
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
							org_id: null,
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
								const {
									data: columnsData,
									error: columnsError,
								} = await supabase.rpc("execute_sql", {
									sql_query: `
										SELECT
											c.column_name as name,
											c.data_type as type,
											CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
											CASE WHEN c.is_nullable = 'NO' THEN false ELSE true END as is_nullable
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
										WHERE
											c.table_name = '${table.name}' AND
											c.table_schema = 'public'
										ORDER BY
											c.ordinal_position
									`,
									org_id: null,
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

								// Process columns data
								const columns = columnsData.map((col: any) => ({
									name: col.name,
									type: col.type,
									isPrimaryKey: col.is_primary,
									isNullable: col.is_nullable,
									description: "", // Default value
								}));

								// Fetch foreign keys
								const {
									data: foreignKeysData,
									error: foreignKeysError,
								} = await supabase.rpc("execute_sql", {
									sql_query: `
										SELECT
											kcu.column_name as column_name,
											ccu.table_name as foreign_table,
											ccu.column_name as foreign_column
										FROM
											information_schema.table_constraints tc
										JOIN
											information_schema.key_column_usage kcu
											ON tc.constraint_name = kcu.constraint_name
										JOIN
											information_schema.constraint_column_usage ccu
											ON tc.constraint_name = ccu.constraint_name
										WHERE
											tc.constraint_type = 'FOREIGN KEY' AND
											tc.table_name = '${table.name}'
									`,
									org_id: null,
								});

								const foreignKeys = foreignKeysError
									? []
									: foreignKeysData.map((fk: any) => ({
											column: fk.column_name,
											foreignTable: fk.foreign_table,
											foreignColumn: fk.foreign_column,
										}));

								return {
									name: table.name,
									columns,
									foreignKeys,
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
			} catch (err: any) {
				console.error("Error fetching schema:", err);
				setError(err.message);
				setTables([]);
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
				<p className="text-sm text-destructive font-medium">Error:</p>
				<p className="text-sm text-destructive text-center px-4">
					{error}
				</p>
				<p className="text-xs text-muted-foreground text-center px-4">
					Try using the Connection Test tab to diagnose the issue.
				</p>
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

	const renderTable = (table: DatabaseTable) => (
		<AccordionItem
			key={table.name}
			value={table.name}
			className={cn(
				"border rounded-lg mb-2",
				highlightedTable === table.name && "border-primary"
			)}>
			<AccordionTrigger
				onClick={() => toggleTable(table.name)}
				className="px-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
				<div className="flex items-center gap-2">
					<Table className="h-4 w-4" />
					<span>{table.name}</span>
					<span className="text-xs text-muted-foreground ml-2">
						({table.columns?.length || 0} columns)
					</span>
				</div>
			</AccordionTrigger>
			<AccordionContent className="px-4 pb-3">
				<div className="space-y-2">
					{table.columns && table.columns.length > 0 ? (
						<div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground mb-1">
							<div>Column</div>
							<div>Type</div>
						</div>
					) : null}
					{table.columns?.map((column) => (
						<div
							key={`${table.name}-${column.name}`}
							className="grid grid-cols-2 gap-x-2 text-sm border-b border-muted pb-1">
							<div className="font-medium flex items-center gap-1">
								{column.isPrimaryKey && (
									<span className="text-primary text-xs">
										🔑
									</span>
								)}
								{table.foreignKeys?.some(
									(fk) => fk.column === column.name
								) && (
									<span className="text-blue-500 text-xs">
										🔗
									</span>
								)}
								<span className="truncate">{column.name}</span>
							</div>
							<div className="text-muted-foreground truncate">
								{column.type}
							</div>
						</div>
					))}
				</div>
			</AccordionContent>
		</AccordionItem>
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
								{tables.map((table) => renderTable(table))}
							</Accordion>
						</TooltipProvider>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
