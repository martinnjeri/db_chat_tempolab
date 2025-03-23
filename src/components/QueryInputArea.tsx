"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Mic, MicOff, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface QueryInputAreaProps {
  onSubmitQuery?: (query: string) => void;
  isProcessing?: boolean;
  initialQuery?: string;
}

const QueryInputArea = ({
  onSubmitQuery = () => {},
  isProcessing = false,
  initialQuery = "",
}: QueryInputAreaProps) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Load recent queries from localStorage
  useEffect(() => {
    const savedQueries = localStorage.getItem("recentQueries");
    if (savedQueries) {
      try {
        const parsedQueries = JSON.parse(savedQueries);
        if (Array.isArray(parsedQueries)) {
          setRecentQueries(parsedQueries.slice(0, 5)); // Keep only the 5 most recent
        }
      } catch (e) {
        console.error("Error parsing saved queries:", e);
      }
    }
  }, []);

  // Save query to recent queries
  const saveQueryToRecent = (queryText: string) => {
    if (!queryText.trim()) return;

    setRecentQueries((prev) => {
      const newQueries = [
        queryText,
        ...prev.filter((q) => q !== queryText),
      ].slice(0, 5);
      localStorage.setItem("recentQueries", JSON.stringify(newQueries));
      return newQueries;
    });
  };

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError(
        "Your browser doesn't support speech recognition. Try Chrome or Edge.",
      );
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setIsRecording(true);
      setError("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsRecording(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      setIsRecording(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript + " ");
        setQuery((prev) => prev + finalTranscript + " ");
      }

      setInterimTranscript(interimTranscript);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isProcessing) {
      saveQueryToRecent(query.trim());
      onSubmitQuery(query);
      setShowSuggestions(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not supported or not initialized");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      setInterimTranscript("");
    } else {
      setTranscript("");
      recognitionRef.current.start();
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const clearQuery = () => {
    setQuery("");
    setTranscript("");
    setInterimTranscript("");
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const useSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Example query suggestions based on user input
  const getSuggestions = () => {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Add recent queries that match the current input
    recentQueries.forEach((recent) => {
      if (
        recent.toLowerCase().includes(lowerQuery) &&
        !suggestions.includes(recent)
      ) {
        suggestions.push(recent);
      }
    });

    // Add predefined suggestions based on input
    if (lowerQuery.includes("user")) {
      suggestions.push("Show me all users", "Count total users");
    }
    if (lowerQuery.includes("product")) {
      suggestions.push(
        "List products with price greater than $50",
        "Show me the most expensive products",
      );
    }
    if (lowerQuery.includes("order")) {
      suggestions.push(
        "Count orders by status",
        "Show me total revenue from orders",
      );
    }
    if (lowerQuery.includes("categor")) {
      suggestions.push(
        "List all categories",
        "Show me categories with descriptions",
      );
    }

    // Return unique suggestions
    return [...new Set(suggestions)].slice(0, 5);
  };

  return (
    <div className="w-full bg-card p-4 rounded-md shadow-sm border border-border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2 relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ask a question about your database..."
            value={query}
            onChange={handleQueryChange}
            className="flex-1 pr-10"
            disabled={isProcessing}
            onFocus={() => query && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-[90px] h-8 w-8"
              onClick={clearQuery}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleVoiceRecording}
                  disabled={isProcessing || !!error}
                  className={isRecording ? "bg-red-100 border-red-500" : ""}
                >
                  {isRecording ? (
                    <MicOff className="text-red-500 animate-pulse" />
                  ) : (
                    <Mic />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? "Stop recording" : "Record voice query"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button type="submit" disabled={!query.trim() || isProcessing}>
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

        {/* Query suggestions */}
        {showSuggestions && query && (
          <div className="absolute z-10 mt-14 w-[calc(100%-8rem)] bg-popover border border-border rounded-md shadow-md">
            {getSuggestions().map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                onClick={() => useSuggestion(suggestion)}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {isRecording && (
          <div className="p-2 bg-muted/50 rounded-md">
            <div className="text-sm font-medium mb-1 flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              <span>Listening... Speak your query clearly</span>
            </div>
            {transcript && (
              <div className="text-sm mb-1">
                <span className="font-medium">Transcribed:</span> {transcript}
              </div>
            )}
            {interimTranscript && (
              <div className="text-sm text-muted-foreground italic">
                {interimTranscript}
              </div>
            )}
          </div>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="text-xs text-muted-foreground">
          Try asking: &quot;Show me all users&quot;, &quot;List products with
          price greater than $50&quot;, or &quot;Count orders by status&quot;
        </div>
      </form>
    </div>
  );
};

export default QueryInputArea;

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
