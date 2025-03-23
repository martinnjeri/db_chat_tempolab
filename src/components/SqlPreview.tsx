"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { cn } from "../lib/utils";
import { Code } from "lucide-react";

interface SqlPreviewProps {
  sql?: string;
  isLoading?: boolean;
  error?: string;
}

export default function SqlPreview({
  sql = "SELECT * FROM users LIMIT 10;",
  isLoading = false,
  error = "",
}: SqlPreviewProps) {
  return (
    <Card className="w-full h-full bg-background border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center gap-2">
            <Code className="h-5 w-5" />
            SQL Preview
          </CardTitle>
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Generating SQL...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm font-mono">
            {error}
          </div>
        ) : (
          <pre
            className={cn(
              "p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto",
              isLoading && "opacity-50",
            )}
          >
            <code>{sql}</code>
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
