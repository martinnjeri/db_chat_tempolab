"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "checking";
  error?: string | null;
  className?: string;
}

export default function ConnectionStatus({
  status,
  error = null,
  className = "",
}: ConnectionStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            {status === "connected" && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {status === "disconnected" && (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            {status === "checking" && (
              <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-sm">
            {status === "connected" && (
              <span className="text-green-500">Connected to database</span>
            )}
            {status === "disconnected" && (
              <div>
                <span className="text-red-500">Database disconnected</span>
                {error && <p className="text-xs mt-1">{error}</p>}
              </div>
            )}
            {status === "checking" && (
              <span className="text-amber-500">Checking connection...</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
