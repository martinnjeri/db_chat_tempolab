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
import { Database, Table, AlignJustify, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import ConnectionStatus from "./ConnectionStatus";

interface TableColumn {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
}

interface DatabaseTable {
  name: string;
  columns: TableColumn[];
}

interface SchemaExplorerProps {
  tables?: DatabaseTable[];
  highlightedTable?: string;
  onTableSelect?: (tableName: string) => void;
}

export default function SchemaExplorer({
  tables = [],
  highlightedTable = "",
  onTableSelect = () => {},
}: SchemaExplorerProps) {
  const [loadedTables, setLoadedTables] = useState<DatabaseTable[]>(tables);
  const [isLoading, setIsLoading] = useState<boolean>(tables.length === 0);
  const [loadError, setLoadError] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<string[]>([]);

  const refreshTables = async () => {
    await fetchDatabaseTables();
  };

  // Function to fetch tables from Supabase
  async function fetchDatabaseTables() {
    try {
      setIsLoading(true);
      setLoadError("");

      // Import the functions dynamically to avoid server-side issues
      const { fetchTables, testConnection, getConnectionStatus } = await import(
        "@/lib/supabaseClient"
      );

      // Test connection first
      const connectionResult = await testConnection();
      setConnectionStatus(
        connectionResult.connected ? "connected" : "disconnected",
      );
      setConnectionError(connectionResult.error);

      if (!connectionResult.connected) {
        setLoadError("Database connection failed: " + connectionResult.error);
        // Use fallback tables
        setFallbackTables();
        return;
      }

      const tablesData = await fetchTables();

      if (tablesData && Array.isArray(tablesData) && tablesData.length > 0) {
        setLoadedTables(tablesData);
      } else {
        // Fallback to default tables if no data is returned
        setFallbackTables();
      }
    } catch (error: any) {
      console.error("Error loading database tables:", error);
      setConnectionStatus("disconnected");
      setConnectionError(error.message || "Unknown error");
      setLoadError(
        "Failed to load database schema. Using sample data instead.",
      );
      // Use default tables as fallback
      setFallbackTables();
    } finally {
      setIsLoading(false);
    }
  }

  // Set fallback tables when connection fails
  const setFallbackTables = () => {
    setLoadedTables([
      {
        name: "users",
        columns: [
          { name: "id", type: "uuid", isPrimary: true },
          { name: "name", type: "varchar" },
          { name: "email", type: "varchar" },
          { name: "created_at", type: "timestamp" },
        ],
      },
      {
        name: "products",
        columns: [
          { name: "id", type: "uuid", isPrimary: true },
          { name: "name", type: "varchar" },
          { name: "price", type: "decimal" },
          { name: "category_id", type: "uuid", isForeign: true },
          { name: "created_at", type: "timestamp" },
        ],
      },
      {
        name: "categories",
        columns: [
          { name: "id", type: "uuid", isPrimary: true },
          { name: "name", type: "varchar" },
          { name: "description", type: "text" },
        ],
      },
      {
        name: "orders",
        columns: [
          { name: "id", type: "uuid", isPrimary: true },
          { name: "user_id", type: "uuid", isForeign: true },
          { name: "total", type: "decimal" },
          { name: "status", type: "varchar" },
          { name: "created_at", type: "timestamp" },
        ],
      },
    ]);
  };

  useEffect(() => {
    // If tables are provided as props, use those
    if (tables.length > 0) {
      setLoadedTables(tables);
      setIsLoading(false);
      return;
    }

    // Otherwise, fetch tables from Supabase
    fetchDatabaseTables();
  }, [tables]);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
    onTableSelect(tableName);
  };

  return (
    <div className="w-full h-full bg-background border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Schema Explorer
          </h2>
          <div className="flex items-center gap-2">
            <ConnectionStatus
              status={connectionStatus}
              error={connectionError}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshTables}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? (
            <span className="inline-flex items-center">
              <span className="h-3 w-3 mr-2 animate-spin rounded-full border-b-2 border-primary"></span>
              Loading tables...
            </span>
          ) : (
            <>
              {connectionStatus === "connected"
                ? `${loadedTables.length} tables available`
                : "Using sample data (not connected)"}
            </>
          )}
        </p>
        {loadError && <p className="text-xs text-red-500 mt-1">{loadError}</p>}
      </div>

      <ScrollArea className="h-[calc(100%-4rem)]">
        <div className="p-2">
          <TooltipProvider>
            <Accordion
              type="multiple"
              value={expandedTables}
              className="w-full"
            >
              {loadedTables.map((table) => (
                <AccordionItem
                  key={table.name}
                  value={table.name}
                  className={cn(
                    "border rounded-md mb-2",
                    highlightedTable === table.name &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <AccordionTrigger
                    onClick={() => toggleTable(table.name)}
                    className={cn(
                      "px-3 hover:no-underline",
                      highlightedTable === table.name &&
                        "text-primary font-medium",
                    )}
                  >
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
                                column.isPrimary && "font-medium",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <AlignJustify className="h-3.5 w-3.5" />
                                <span
                                  className={
                                    column.isPrimary ? "text-primary" : ""
                                  }
                                >
                                  {column.name}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {column.type}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <div>
                              <div className="font-medium">{column.name}</div>
                              <div className="text-xs">Type: {column.type}</div>
                              {column.isPrimary && (
                                <div className="text-xs text-primary">
                                  Primary Key
                                </div>
                              )}
                              {column.isForeign && (
                                <div className="text-xs text-blue-500">
                                  Foreign Key
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
        </div>
      </ScrollArea>
    </div>
  );
}
