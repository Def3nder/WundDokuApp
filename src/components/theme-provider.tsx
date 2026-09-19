"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dark Mode ueber eine Klasse am <html>, damit die Tokens in globals.css
 * greifen. Systemvorgabe ist die Voreinstellung - im Nachtdienst laeuft das
 * Tablet meist ohnehin dunkel.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
