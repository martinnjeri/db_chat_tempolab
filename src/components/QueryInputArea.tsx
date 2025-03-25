"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Mic, Send, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface QueryInputAreaProps {
  onSubmitQuery?: (query: string) => void;
  isProcessing?: boolean;
}

const QueryInputArea = ({
  onSubmitQuery = () => {},
  isProcessing = false,
}: QueryInputAreaProps) => {
  const [query, setQuery] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isProcessing) {
      onSubmitQuery(query);
    }
  };

  const startVoiceRecording = () => {
    // This would be implemented with the Web Speech API in a real application
    setIsRecording(true);

    // Simulate voice recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      // Simulate transcribed text
      setQuery("Show me all customers who made purchases last month");
    }, 3000);
  };

  return (
    <div className="w-full bg-card p-4 rounded-md shadow-sm border border-border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Ask a question about your database..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
            disabled={isProcessing || isRecording}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={startVoiceRecording}
                  disabled={isProcessing || isRecording}
                  className={isRecording ? "bg-red-100 border-red-500" : ""}
                >
                  <Mic
                    className={isRecording ? "text-red-500 animate-pulse" : ""}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Record voice query</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            type="submit"
            disabled={!query.trim() || isProcessing || isRecording}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </div>

        {isRecording && (
          <div className="text-sm text-center text-muted-foreground animate-pulse">
            Listening... Speak your query clearly
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Try asking: &quot;Show me all doctors&quot;, &quot;How many patients
          are there?&quot;, &quot;Show me patients by gender&quot;, &quot;List
          all tables in the database&quot;, or &quot;Show me sample table
          data&quot;
        </div>
      </form>
    </div>
  );
};

export default QueryInputArea;
