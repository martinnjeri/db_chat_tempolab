"use client";

import { ThemeProvider } from "next-themes";
import { OrganizationProvider } from "@/lib/organizationContext";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<OrganizationProvider>{children}</OrganizationProvider>
		</ThemeProvider>
	);
}
