"use client";

import React, { useState } from "react";
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

  const handleSubmitQuery = async (queryText: string) => {
    setQuery(queryText);
    setIsProcessing(true);
    setError(null);

    try {
      // For now, we'll use a simple rule-based approach to generate SQL
      // In a real app, this would be replaced with a call to Gemma or another NLP service
      let generatedSql = "";
      let detectedTable = "";
      let resultFormat: "table" | "list" | "value" = "table";

      const query = queryText.toLowerCase();

      // More robust pattern matching for natural language queries
      if (query.includes("doctor")) {
        if (query.includes("count") || query.includes("how many")) {
          generatedSql = "SELECT COUNT(*) as count FROM doctors;";
          resultFormat = "value";
        } else if (query.includes("name") && query.includes("specialty")) {
          generatedSql = "SELECT name, specialty FROM doctors LIMIT 20;";
        } else {
          generatedSql = "SELECT * FROM doctors LIMIT 10;";
        }
        detectedTable = "doctors";
      } else if (query.includes("patient")) {
        if (query.includes("count") || query.includes("how many")) {
          generatedSql = "SELECT COUNT(*) as count FROM patients;";
          resultFormat = "value";
        } else if (query.includes("age")) {
          generatedSql =
            "SELECT name, age, gender FROM patients ORDER BY age DESC LIMIT 15;";
        } else if (query.includes("gender")) {
          generatedSql =
            "SELECT gender, COUNT(*) as count FROM patients GROUP BY gender;";
          resultFormat = "table";
        } else {
          generatedSql = "SELECT * FROM patients LIMIT 10;";
        }
        detectedTable = "patients";
      } else if (query.includes("sample") || query.includes("sample_table")) {
        if (query.includes("count") || query.includes("how many")) {
          generatedSql = "SELECT COUNT(*) as count FROM sample_table;";
          resultFormat = "value";
        } else if (query.includes("email")) {
          generatedSql = "SELECT name, email FROM sample_table LIMIT 15;";
        } else {
          generatedSql = "SELECT * FROM sample_table LIMIT 10;";
        }
        detectedTable = "sample_table";
      } else if (
        query.includes("tables") ||
        query.includes("schema") ||
        query.includes("database structure")
      ) {
        generatedSql = `
          SELECT 
            table_name as name
          FROM 
            information_schema.tables 
          WHERE 
            table_schema = 'public' AND 
            table_type = 'BASE TABLE'
          ORDER BY 
            table_name
        `;
        detectedTable = "";
        resultFormat = "table";
      } else {
        // Default query to show available tables
        generatedSql = `
          SELECT 
            table_name as name,
            (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
          FROM 
            information_schema.tables t
          WHERE 
            table_schema = 'public' AND 
            table_type = 'BASE TABLE'
          ORDER BY 
            table_name
        `;
        detectedTable = "";
        resultFormat = "table";
      }

      setSql(generatedSql);
      setHighlightedTable(detectedTable);

      // Execute the SQL query using Supabase with better error handling
      try {
        const { data, error: queryError } = await supabase.rpc("execute_sql", {
          sql_query: generatedSql,
        });

        if (queryError) {
          throw new Error(`Query execution error: ${queryError.message}`);
        }

        if (!data) {
          throw new Error("No data returned from query");
        }

        // Set the results and result type
        setResultType(resultFormat);
        setResults(data);
      } catch (queryErr: any) {
        console.error("SQL execution error:", queryErr);
        throw new Error(`Failed to execute SQL: ${queryErr.message}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process query. Please try again.");
      console.error("Error processing query:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setHighlightedTable(tableName);
    // Optionally generate a sample query for the selected table
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
