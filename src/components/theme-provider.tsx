"use client";

import { useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

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

/**
 * Meldet den Dunkelmodus erst nach der Hydration - vorher immer `false`.
 *
 * Fuer Farben, die nicht per CSS, sondern in JavaScript bestimmt werden
 * muessen (feste SVG-Attributwerte, siehe `abmessungen-verlauf.tsx`), ist
 * `resolvedTheme` direkt nicht brauchbar: Der Server kennt das Theme nicht und
 * rendert die hellen Werte, waehrend `useTheme()` auf dem Client schon beim
 * ersten Rendergang aus dem localStorage liest. React meldet dann eine
 * Hydrationsabweichung je Attribut (`fill="#fda4af"` gegen `fill="#be123c"`).
 *
 * Die Sperre laesst den ersten Client-Rendergang mit dem Servermarkup
 * uebereinstimmen und faerbt erst danach um - dieselbe Loesung wie das
 * `bereit`-Flag in `theme-toggle.tsx`. Sichtbar ist das nicht: Das helle
 * Markup steht ohnehin schon im gelieferten HTML, die Umfaerbung passiert wie
 * bisher beim Hydrieren, nur einen Rendergang spaeter.
 */
export function useIstDunkel(): boolean {
  const { resolvedTheme } = useTheme();
  const [hydriert, setHydriert] = useState(false);
  useEffect(() => setHydriert(true), []);
  return hydriert && resolvedTheme === "dark";
}
