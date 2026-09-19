"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER = [
  { wert: "alle", label: "Alle" },
  { wert: "offen", label: "Mit offener Wunde" },
] as const;

/**
 * Suche und Filter der Patientenliste.
 *
 * Der Zustand steht in der URL, damit ein Treffer teilbar ist und der
 * Zurueck-Knopf die vorherige Suche wiederherstellt.
 */
export function PatientenSuche({
  standardSuche,
  standardFilter,
}: {
  standardSuche: string;
  standardFilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [suche, setSuche] = useState(standardSuche);
  const [laeuft, starteUebergang] = useTransition();
  const ersterLauf = useRef(true);

  function navigiere(q: string, filter: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter !== "alle") params.set("filter", filter);
    const query = params.toString();
    starteUebergang(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  // Erst nach einer Tippause suchen - sonst laeuft bei jedem Zeichen eine
  // Abfrage und die Liste flackert.
  useEffect(() => {
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    const timer = setTimeout(() => navigiere(suche, standardFilter), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suche]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="patientensuche" className="nur-screenreader">
          Patienten durchsuchen
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="patientensuche"
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Name oder Patientennummer"
          className="min-h-11 w-full rounded-lg border border-border-strong bg-input py-2.5 pl-11 pr-11 text-base text-foreground"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {laeuft ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            suche && (
              <button
                type="button"
                onClick={() => setSuche("")}
                aria-label="Suche leeren"
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )
          )}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Filter"
        className="inline-flex rounded-lg border border-border bg-surface p-1"
      >
        {FILTER.map((f) => {
          const aktiv = standardFilter === f.wert;
          return (
            <button
              key={f.wert}
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => navigiere(suche, f.wert)}
              className={cn(
                "min-h-9 rounded-md px-3 text-sm font-medium transition-colors duration-200",
                aktiv
                  ? "bg-primary text-on-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Ergebnisanzahl aendert sich ohne Neuladen - Screenreader brauchen den Hinweis. */}
      <span aria-live="polite" className="nur-screenreader">
        {laeuft ? "Suche läuft" : "Suchergebnisse aktualisiert"}
      </span>
    </div>
  );
}
