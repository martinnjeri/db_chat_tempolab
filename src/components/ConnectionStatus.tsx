"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  checkConnection,
  addConnectionListener,
  attemptReconnect,
} from "@/lib/supabaseClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string>("");
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    // Initial connection check
    async function initialCheck() {
      try {
        // First check if environment variables are set
        if (
          !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ) {
          throw new Error(
            "Missing Supabase environment variables. Check your .env file.",
          );
        }

        // Try to get the user session as a simple connection test
        const { data: authData, error: authError } =
          await supabase.auth.getSession();

        if (authError) {
          throw new Error(`Connection error: ${authError.message}`);
        }

        // Try a simple RPC call
        const { data, error } = await supabase.rpc("execute_sql", {
          sql_query: "SELECT 1 as connected",
          org_id: null,
        });

        if (error) {
          throw new Error(`Connection error: ${error.message}`);
        }

        setStatus("connected");
        setMessage(
          `Connected to Supabase at ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
        );
      } catch (err: any) {
        console.error("Supabase connection error:", err);
        setStatus("error");
        setMessage(err.message || "Failed to connect to Supabase");
      }
    }

    initialCheck();

    // Set up connection status listener
    const removeListener = addConnectionListener((isConnected) => {
      if (isConnected) {
        setStatus("connected");
        setMessage(
          `Connected to Supabase at ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
        );
      } else {
        setStatus("error");
        setMessage("Lost connection to Supabase. Attempting to reconnect...");
      }
    });

    // Set up periodic connection check (every 30 seconds)
    const intervalId = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => {
      removeListener();
      clearInterval(intervalId);
    };
  }, []);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    setMessage("Attempting to reconnect...");

    try {
      const success = await checkConnection();
      if (!success) {
        // If immediate check fails, try with backoff
        await attemptReconnect();
      }
    } catch (err) {
      console.error("Manual reconnection failed:", err);
    } finally {
      setIsReconnecting(false);
    }
  };

  if (status === "loading") {
    return (
      <Alert className="bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <AlertTitle>Checking database connection...</AlertTitle>
      </Alert>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <XCircle className="h-4 w-4 mr-2" />
            <AlertTitle>Connection Error</AlertTitle>
          </div>
          <AlertDescription>{message}</AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualReconnect}
          disabled={isReconnecting}
          className="ml-2 bg-background/80"
        >
          {isReconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </>
          )}
        </Button>
      </Alert>
    );
  }

  return (
    <Alert className="bg-success/10 border-success/30">
      <CheckCircle2 className="h-4 w-4 text-success" />
      <AlertTitle>Connected to Supabase</AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground">
        {message}
      </AlertDescription>
    </Alert>
  );
}
