"use client";

import React, { useState, useEffect } from "react";
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
  Download,
  Copy,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ResultsDisplayProps {
  results?: any[] | null;
  error?: string | null;
  loading?: boolean;
  resultType?: "table" | "list" | "value" | "empty";
}

export default function ResultsDisplay({
  results = null,
  error = null,
  loading = false,
  resultType = "empty",
}: ResultsDisplayProps) {
  const [activeView, setActiveView] = useState<"table" | "json">("table");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [rowCount, setRowCount] = useState<number>(0);

  // Calculate row count when results change
  useEffect(() => {
    if (results && Array.isArray(results)) {
      setRowCount(results.length);
    } else {
      setRowCount(0);
    }
  }, [results]);

  // Reset copy success message after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Mock data for demonstration
  const mockTableData = results || [
    { id: 1, name: "Product A", category: "Electronics", price: 299.99 },
    { id: 2, name: "Product B", category: "Clothing", price: 49.99 },
    { id: 3, name: "Product C", category: "Home", price: 129.99 },
    { id: 4, name: "Product D", category: "Electronics", price: 599.99 },
    { id: 5, name: "Product E", category: "Clothing", price: 79.99 },
  ];

  const mockListData = results || [
    "Electronics department generated $45,000 in revenue last month",
    "Clothing department generated $32,000 in revenue last month",
    "Home department generated $28,000 in revenue last month",
  ];

  const mockValueData =
    results || "Total revenue across all departments: $105,000";

  const copyToClipboard = () => {
    let textToCopy = "";

    if (activeView === "json") {
      textToCopy = JSON.stringify(mockTableData, null, 2);
    } else if (resultType === "table") {
      // Create CSV format for table data
      const columns = Object.keys(mockTableData[0]);
      textToCopy = columns.join(",") + "\n";
      mockTableData.forEach((row) => {
        textToCopy += columns.map((col) => `"${row[col]}"`).join(",") + "\n";
      });
    } else if (resultType === "list") {
      textToCopy = mockListData.join("\n");
    } else if (resultType === "value") {
      textToCopy = mockValueData.toString();
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => setCopySuccess(true))
      .catch((err) => console.error("Failed to copy text: ", err));
  };

  const downloadResults = () => {
    let content = "";
    let filename = "query_results";
    let extension = ".txt";

    if (activeView === "json" || resultType === "table") {
      content = JSON.stringify(mockTableData, null, 2);
      extension = ".json";
    } else if (resultType === "list") {
      content = mockListData.join("\n");
      extension = ".txt";
    } else if (resultType === "value") {
      content = mockValueData.toString();
      extension = ".txt";
    }

    // Create a blob and download it
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        {error || "There was an error processing your query. Please try again."}
      </AlertDescription>
    </Alert>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <Database className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No Results Yet</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Enter a natural language query above to search the database. Your
        results will appear here.
      </p>
    </div>
  );

  const renderTableData = () => {
    if (!mockTableData.length) return renderEmpty();

    const columns = Object.keys(mockTableData[0]);

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
            {mockTableData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {typeof row[column] === "number"
                      ? column.toLowerCase().includes("price") ||
                        column.toLowerCase().includes("total")
                        ? `${row[column].toFixed(2)}`
                        : row[column].toString()
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
    if (!mockListData.length) return renderEmpty();

    return (
      <div className="space-y-2 p-2">
        {mockListData.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
          >
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <p>{item}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderValueData = () => {
    if (!mockValueData) return renderEmpty();

    return (
      <div className="flex items-center justify-center h-full">
        <Alert className="max-w-md">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Query Result</AlertTitle>
          <AlertDescription className="text-lg font-medium mt-2">
            {mockValueData}
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return renderLoading();
    if (error) return renderError();

    switch (resultType) {
      case "table":
        return (
          <Tabs
            defaultValue="table"
            className="w-full"
            onValueChange={(v) => setActiveView(v as "table" | "json")}
            value={activeView}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">
                {rowCount > 0 &&
                  `${rowCount} row${rowCount !== 1 ? "s" : ""} found`}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-8"
                      >
                        {copySuccess ? (
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy results to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadResults}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download results as file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TabsList>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="json">JSON View</TabsTrigger>
                </TabsList>
              </div>
            </div>
            <TabsContent value="table" className="mt-0">
              {renderTableData()}
            </TabsContent>
            <TabsContent value="json" className="mt-0">
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                {JSON.stringify(mockTableData, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        );
      case "list":
        return (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">
                {mockListData.length > 0 &&
                  `${mockListData.length} item${mockListData.length !== 1 ? "s" : ""} found`}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-8"
                      >
                        {copySuccess ? (
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy results to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadResults}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download results as file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {renderListData()}
          </div>
        );
      case "value":
        return (
          <div>
            <div className="flex justify-end items-center mb-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-8"
                      >
                        {copySuccess ? (
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy result to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {renderValueData()}
          </div>
        );
      case "empty":
      default:
        return renderEmpty();
    }
  };

  return (
    <Card className="w-full h-full bg-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Database className="h-5 w-5" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
