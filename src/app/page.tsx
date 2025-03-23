import React from "react";
import QueryInterface from "@/components/QueryInterface";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SQL Query Assistant",
  description: "Query SQL databases using natural language and voice input",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SQL Query Assistant",
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card p-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary-foreground"
              >
                <path d="M17 11V3h-7v4H3v14h14v-7h4V7h-4z" />
                <path d="M8 16l-4-4 4-4" />
                <path d="M17 7l4 4-4 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">SQL Query Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Ask questions about your database in natural language
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Powered by Gemma & Supabase
          </div>
        </div>
      </header>

      <div className="container mx-auto flex-1 p-4">
        <div className="h-[calc(100vh-8rem)]">
          <QueryInterface />
        </div>
      </div>

      <footer className="border-t bg-muted py-2 text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          SQL Query Assistant PWA &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </main>
  );
}
