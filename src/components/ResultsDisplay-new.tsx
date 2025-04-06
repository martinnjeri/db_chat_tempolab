"use client";

import React from "react";
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
  context?: string;
}

export default function ResultsDisplay({
  results = null,
  error = null,
  loading = false,
  resultType = "empty",
  explanation = "",
  context = "",
}: ResultsDisplayProps) {
  // Use the actual results data
  const tableData = results || [];

  const renderEmpty = () => (
    <div className="flex items-center justify-center p-8">
      <Alert>
        <Database className="h-4 w-4 text-muted-foreground" />
        <AlertTitle>No Results</AlertTitle>
        <AlertDescription>
          No data was returned for your query.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">Executing query...</div>
      </div>
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  const renderExplanation = () => {
    if (!explanation) return null;
    return (
      <Alert className="mb-4">
        <CheckCircle2 className="h-4 w-4 text-primary" />
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
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className="sticky top-0 bg-background z-10 font-semibold"
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`} className="px-4 py-2">
                    {column === "organization_id" && row["organization_name"]
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

  // Main render
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : (
          <div className="space-y-4">
            {renderContext()}
            {renderExplanation()}
            <div className="w-full">
              {resultType === "table" && tableData.length > 0 ? (
                <Tabs defaultValue="table" className="w-full">
                  <div className="flex justify-end mb-2">
                    <TabsList>
                      <TabsTrigger value="table">Table View</TabsTrigger>
                      <TabsTrigger value="json">JSON View</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="table" className="mt-0">
                    {renderTableData()}
                  </TabsContent>
                  <TabsContent value="json" className="mt-0">
                    <pre className="bg-muted p-4 rounded-md whitespace-pre-wrap break-all">
                      {JSON.stringify(tableData, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              ) : (
                renderEmpty()
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
