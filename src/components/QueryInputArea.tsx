"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Loader2 } from "lucide-react";
import VoiceInputButton from "./VoiceInputButton";

interface QueryInputAreaProps {
  onSubmitQuery?: (query: string) => void;
  isProcessing?: boolean;
}

const QueryInputArea = ({
  onSubmitQuery = () => {},
  isProcessing = false,
}: QueryInputAreaProps) => {
  const [query, setQuery] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isProcessing) {
      onSubmitQuery(query);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setQuery(transcript);
    setIsListening(false);
  };

  return (
    <div className="w-full bg-card p-4 rounded-md shadow-sm border border-border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Ask a question about your database..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 pr-10"
              disabled={isProcessing || isListening}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <VoiceInputButton
                onTranscript={handleVoiceInput}
                disabled={isProcessing}
                className="h-8 w-8"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!query.trim() || isProcessing || isListening}
            className="w-full sm:w-auto mt-2 sm:mt-0"
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

        {isListening && (
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
