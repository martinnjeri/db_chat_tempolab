"use client";

import React, { useState, useRef, useEffect } from "react";
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
import {
	AlertCircle,
	CheckCircle2,
	Database,
	ArrowDown,
	ArrowUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomScrollArea } from "@/components/ui/custom-scroll-area";
import { Button } from "@/components/ui/button";

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

	// Ref for the scroll area
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	// State to track if we're at the bottom of the scroll
	const [isAtBottom, setIsAtBottom] = useState(true);
	// State to track if we're at the top of the scroll
	const [isAtTop, setIsAtTop] = useState(true);

	// Function to handle scroll events
	const handleScroll = () => {
		if (!scrollAreaRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;

		// Check if we're at the top
		setIsAtTop(scrollTop === 0);

		// Check if we're at the bottom
		setIsAtBottom(Math.abs(scrollHeight - scrollTop - clientHeight) < 10);
	};

	// Function to scroll to the bottom
	const scrollToBottom = () => {
		if (!scrollAreaRef.current) return;
		scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
	};

	// Function to scroll to the top
	const scrollToTop = () => {
		if (!scrollAreaRef.current) return;
		scrollAreaRef.current.scrollTop = 0;
	};

	// Effect to scroll to the bottom when new results come in
	useEffect(() => {
		// Only auto-scroll if we're already at the bottom or this is the first load
		if (isAtBottom || !results) {
			// Use a small timeout to ensure the DOM has updated
			const timer = setTimeout(() => {
				scrollToBottom();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [results, isAtBottom]);

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
			<div className="w-full">
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
										{column === "organization_id" &&
										row["organization_name"]
											? `${row[column]} (${row["organization_name"]})`
											: row[column]}
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
			<div className="space-y-4 relative">
				{renderContext()} {/* Add context section */}
				{renderExplanation()}
				{/* Scroll controls */}
				<div className="absolute right-2 bottom-2 flex flex-col gap-1 z-10">
					<Button
						size="icon"
						variant="secondary"
						className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
						onClick={scrollToTop}
						disabled={isAtTop}
						title="Scroll to top">
						<ArrowUp className="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="secondary"
						className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
						onClick={scrollToBottom}
						disabled={isAtBottom}
						title="Scroll to bottom">
						<ArrowDown className="h-4 w-4" />
					</Button>
				</div>
				<div className="relative">
					<CustomScrollArea
						ref={scrollAreaRef}
						className="h-[400px] pr-8"
						onScroll={handleScroll}>
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
									<pre className="bg-muted p-4 rounded-md">
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
					</CustomScrollArea>
				</div>
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
