"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database, Table } from "lucide-react";

export default function DatabaseTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function testTables() {
    setLoading(true);
    setError(null);
    try {
      // First test the execute_sql function directly
      const { data: functionTest, error: functionError } = await supabase.rpc(
        "execute_sql",
        {
          sql_query: "SELECT 'test' as result;",
        },
      );

      if (functionError) {
        throw new Error(`execute_sql function error: ${functionError.message}`);
      }

      if (!functionTest || functionTest.length === 0) {
        throw new Error("execute_sql function returned empty result");
      }

      // Get list of tables
      const { data: tables, error: tablesError } = await supabase.rpc(
        "execute_sql",
        {
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
        },
      );

      if (tablesError)
        throw new Error(`Tables query error: ${tablesError.message}`);

      if (!tables || tables.length === 0) {
        setResults({
          tables: [],
          tableData: [],
          message:
            "No tables found in the database. Make sure your migrations have been applied.",
        });
        return;
      }

      // For each table, get a sample row
      const tableData = await Promise.all(
        tables.map(async (table: { name: string }) => {
          try {
            const { data: sampleData, error: sampleError } = await supabase.rpc(
              "execute_sql",
              {
                sql_query: `SELECT * FROM "${table.name}" LIMIT 1`,
              },
            );

            return {
              name: table.name,
              sample: sampleData || [],
              error: sampleError ? sampleError.message : null,
            };
          } catch (tableErr: any) {
            return {
              name: table.name,
              sample: [],
              error: `Error querying table: ${tableErr.message}`,
            };
          }
        }),
      );

      setResults({
        tables: tables,
        tableData: tableData,
      });
    } catch (err: any) {
      console.error("Database test error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={testTables} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>Test Database Connection</>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Available Tables ({results.tables.length})
                </h3>
                {results.tables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tables found in the database.
                  </p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {results.tables.map((table: any) => (
                      <li key={table.name} className="text-sm">
                        {table.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {results.tableData && results.tableData.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Sample Data:</h3>
                  {results.tableData.map((tableInfo: any) => (
                    <div
                      key={tableInfo.name}
                      className="p-4 bg-muted rounded-md"
                    >
                      <h4 className="font-medium mb-2">{tableInfo.name}</h4>
                      {tableInfo.error ? (
                        <p className="text-sm text-destructive">
                          {tableInfo.error}
                        </p>
                      ) : tableInfo.sample.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No data in table
                        </p>
                      ) : (
                        <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-[200px]">
                          {JSON.stringify(tableInfo.sample, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
