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
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { testConnection } = await import("@/lib/supabaseClient");
        const result = await testConnection();
        if (!result.connected) {
          setError(
            "Database connection failed: " + (result.error || "Unknown error"),
          );
        }
      } catch (err: any) {
        console.error("Error checking connection:", err);
        setError("Failed to check database connection.");
      }
    };

    checkConnection();
  }, []);

  const handleSubmitQuery = async (queryText: string) => {
    setQuery(queryText);
    setIsProcessing(true);
    setError(null);

    try {
      // Import the necessary functions dynamically to avoid server-side issues
      const { executeQuery, testConnection } = await import(
        "@/lib/supabaseClient"
      );

      // Test connection first
      const connectionTest = await testConnection();
      setConnectionStatus(
        connectionTest.connected ? "connected" : "disconnected",
      );

      if (!connectionTest.connected) {
        throw new Error(
          "Database connection failed: " +
            (connectionTest.error || "Unknown error"),
        );
      }

      // Generate SQL based on natural language query
      let generatedSql = "";
      let detectedTable = "";

      // Enhanced SQL generation based on query text
      if (queryText.toLowerCase().includes("user")) {
        generatedSql = "SELECT * FROM users ORDER BY created_at DESC LIMIT 10;";
        detectedTable = "users";
      } else if (
        queryText.toLowerCase().includes("product") &&
        queryText.toLowerCase().includes("expensive")
      ) {
        generatedSql =
          "SELECT id, name, price, category_id FROM products ORDER BY price DESC LIMIT 5;";
        detectedTable = "products";
      } else if (queryText.toLowerCase().includes("product")) {
        generatedSql =
          "SELECT id, name, price, category_id FROM products WHERE price > 50 ORDER BY price DESC;";
        detectedTable = "products";
      } else if (queryText.toLowerCase().includes("categor")) {
        generatedSql = "SELECT name, description FROM categories;";
        detectedTable = "categories";
      } else if (
        queryText.toLowerCase().includes("order") &&
        queryText.toLowerCase().includes("count")
      ) {
        generatedSql =
          "SELECT status, COUNT(*) as count FROM orders GROUP BY status;";
        detectedTable = "orders";
      } else if (
        queryText.toLowerCase().includes("order") &&
        queryText.toLowerCase().includes("total")
      ) {
        generatedSql = "SELECT SUM(total) as total_revenue FROM orders;";
        detectedTable = "orders";
      } else if (queryText.toLowerCase().includes("order")) {
        generatedSql =
          "SELECT id, user_id, total, status FROM orders ORDER BY created_at DESC LIMIT 10;";
        detectedTable = "orders";
      } else {
        generatedSql = "SELECT * FROM users LIMIT 10;";
        detectedTable = "users";
      }

      setSql(generatedSql);
      setHighlightedTable(detectedTable);

      try {
        // Execute the SQL query using Supabase
        const { data, error: queryError } = await executeQuery(generatedSql);

        if (queryError) {
          throw new Error(queryError);
        }

        // Set the results based on the query response
        if (data && Array.isArray(data)) {
          setResults(data);

          // Determine result type based on data structure
          if (data.length === 1 && Object.keys(data[0]).length === 1) {
            setResultType("value");
          } else if (data.length > 0 && Object.keys(data[0]).length <= 2) {
            setResultType("list");
          } else {
            setResultType("table");
          }
        } else {
          setResults([]);
          setResultType("empty");
        }
      } catch (queryErr: any) {
        console.error("Error executing SQL query:", queryErr);
        setError(queryErr.message || "Failed to execute SQL query");
        setResults(null);
        setResultType("empty");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process query. Please try again.");
      console.error("Error processing query:", err);
      setResults(null);
      setResultType("empty");
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
          className="h-full"
        >
          <SchemaExplorer
            highlightedTable={highlightedTable}
            onTableSelect={handleTableSelect}
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
                initialQuery={query}
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
