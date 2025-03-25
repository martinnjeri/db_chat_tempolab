"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ResultsDisplayProps {
	results?: any[] | null;
	error?: string | null;
	loading?: boolean;
	resultType?: "table" | "list" | "value" | "empty";
	explanation?: string;
	context?: string; // Add new prop for context
}

export default function ResultsDisplay({
	results = null,
	error = null,
	loading = false,
	resultType = "empty",
	explanation = "",
	context = "", // Add default value
}: ResultsDisplayProps) {
	const [activeView, setActiveView] = useState<"table" | "json">("table");

	// Use the actual results data
	const tableData = results || [];
	const listData = results || [];
	const valueData = results && results.length > 0 ? results[0] : "";

	const renderLoading = () => (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center space-y-4">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
				<p className="text-sm text-muted-foreground">
					Processing your query...
				</p>
			</div>
		</div>
	);

	const renderError = () => (
		<Alert variant="destructive" className="mb-4">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>
				{error ||
					"There was an error processing your query. Please try again."}
			</AlertDescription>
		</Alert>
	);

	const renderEmpty = () => (
		<div className="flex flex-col items-center justify-center h-full py-12 text-center">
			<Database className="h-16 w-16 text-muted-foreground mb-4" />
			<h3 className="text-lg font-medium">No Results Yet</h3>
			<p className="text-sm text-muted-foreground mt-2 max-w-md">
				Enter a natural language query above to search the database.
				Your results will appear here.
			</p>
		</div>
	);

	const renderExplanation = () => {
		if (!explanation) return null;
		return (
			<Alert className="mb-4">
				<CheckCircle2 className="h-4 w-4" />
				<AlertTitle>Query Explanation</AlertTitle>
				<AlertDescription className="prose prose-sm max-w-none">
					{explanation}
				</AlertDescription>
			</Alert>
		);
	};

	const renderContext = () => {
		if (!context) return null;
		return (
			<Alert className="mb-4 bg-muted/50">
				<AlertCircle className="h-4 w-4 text-primary" />
				<AlertTitle>I understood your query as</AlertTitle>
				<AlertDescription className="prose prose-sm max-w-none">
					{context}
				</AlertDescription>
			</Alert>
		);
	};

	const renderTableData = () => {
		if (!tableData.length) return renderEmpty();

		const columns = Object.keys(tableData[0]);

		return (
			<div className="overflow-auto">
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead key={column}>{column}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{tableData.map((row, rowIndex) => (
							<TableRow key={rowIndex}>
								{columns.map((column) => (
									<TableCell key={`${rowIndex}-${column}`}>
										{row[column]}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	};

	const renderListData = () => {
		if (!listData.length) return renderEmpty();

		return (
			<div className="space-y-3 p-2">
				{listData.map((item, index) => {
					// Format the item based on its type
					let formattedItem = item;

					if (typeof item === "object") {
						// If it's an object, create a formatted string from its properties
						formattedItem = Object.entries(item)
							.map(([key, value]) => {
								const formattedKey = key
									.replace(/_/g, " ")
									.replace(/\b\w/g, (l) => l.toUpperCase());
								return `${formattedKey}: ${value}`;
							})
							.join(", ");
					}

					return (
						<div
							key={index}
							className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
							<CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
							<p className="text-sm leading-relaxed">
								{formattedItem}
							</p>
						</div>
					);
				})}
			</div>
		);
	};

	const renderValueData = () => {
		if (!valueData) return renderEmpty();

		// Format the value based on its type
		let formattedValue = valueData;
		let valueLabel = "Result";

		// Get the first key if valueData is an object
		const key =
			typeof valueData === "object" ? Object.keys(valueData)[0] : null;

		if (key) {
			valueLabel = key
				.replace(/_/g, " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());
			formattedValue = valueData[key];
		}

		// Format numbers with commas
		if (typeof formattedValue === "number") {
			formattedValue = formattedValue.toLocaleString();
		}

		return (
			<div className="flex items-center justify-center h-full">
				<Alert className="max-w-md">
					<CheckCircle2 className="h-4 w-4 text-primary" />
					<AlertTitle>{valueLabel}</AlertTitle>
					<AlertDescription className="text-2xl font-medium mt-2 text-center">
						{formattedValue}
					</AlertDescription>
				</Alert>
			</div>
		);
	};

	const renderContent = () => {
		if (loading) return renderLoading();
		if (error) return renderError();

		return (
			<div className="space-y-4">
				{renderContext()} {/* Add context section */}
				{renderExplanation()}
				{resultType === "table" ? (
					<Tabs
						defaultValue="table"
						className="w-full"
						onValueChange={(v) =>
							setActiveView(v as "table" | "json")
						}>
						<div className="flex justify-end mb-2">
							<TabsList>
								<TabsTrigger value="table">
									Table View
								</TabsTrigger>
								<TabsTrigger value="json">
									JSON View
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent value="table" className="mt-0">
							{renderTableData()}
						</TabsContent>
						<TabsContent value="json" className="mt-0">
							<pre className="bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
								{JSON.stringify(tableData, null, 2)}
							</pre>
						</TabsContent>
					</Tabs>
				) : resultType === "list" ? (
					renderListData()
				) : resultType === "value" ? (
					renderValueData()
				) : (
					renderEmpty()
				)}
			</div>
		);
	};

	return (
		<Card className="w-full h-full bg-background">
			<CardHeader className="pb-2">
				<CardTitle className="text-xl flex items-center gap-2">
					<Database className="h-5 w-5" />
					Results
				</CardTitle>
			</CardHeader>
			<CardContent className="h-[calc(100%-60px)] overflow-auto">
				{renderContent()}
			</CardContent>
		</Card>
	);
}
