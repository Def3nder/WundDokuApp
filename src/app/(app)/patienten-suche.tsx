"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fokussiereRadio, radioZielIndex } from "@/lib/tastatur";

/**
 * Ein Eintrag je Bereich der Liste.
 *
 * `offen` behaelt seinen alten Wert, obwohl die Beschriftung jetzt
 * "In Behandlung" lautet - so funktionieren vorhandene Links und Lesezeichen
 * weiter.
 */
const FILTER = [
  { wert: "alle", label: "Alle" },
  { wert: "offen", label: "In Behandlung" },
  { wert: "abgeschlossen", label: "Keine Behandlungen" },
  { wert: "neu", label: "Neue Patienten" },
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

  function navigiere(q: string, filter: string) {
    if (q.trim() === standardSuche.trim() && filter === standardFilter) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter !== "alle") params.set("filter", filter);
    const query = params.toString();
    starteUebergang(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function filterMitTastatur(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const ziel = radioZielIndex(event.key, index, FILTER.length);
    if (ziel == null) return;
    event.preventDefault();
    fokussiereRadio(event.currentTarget, ziel);
    navigiere(suche, FILTER[ziel].wert);
  }

  // Erst nach einer Tippause suchen - sonst laeuft bei jedem Zeichen eine
  // Abfrage und die Liste flackert.
  useEffect(() => {
    // Auch beim erneuten Effect-Aufruf im Entwicklungsmodus darf das Laden
    // der Seite keine zweite Navigation zur unveränderten Suche auslösen.
    if (suche.trim() === standardSuche.trim()) return;
    const timer = setTimeout(() => navigiere(suche, standardFilter), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suche]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-[1_1_20rem]">
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
          className="h-11 min-w-0 w-full rounded-lg border border-border-strong bg-input py-2 pl-11 pr-11 text-base leading-6 text-foreground"
        />
        <div className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center">
          {laeuft ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            suche && (
              <button
                type="button"
                onClick={() => setSuche("")}
                aria-label="Suche leeren"
                className="flex size-11 items-center justify-center rounded text-muted-foreground hover:text-foreground"
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
        className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-surface p-1"
      >
        {FILTER.map((f, index) => {
          const aktiv = standardFilter === f.wert;
          return (
            <button
              key={f.wert}
              type="button"
              role="radio"
              aria-checked={aktiv}
              tabIndex={aktiv ? 0 : -1}
              onClick={() => navigiere(suche, f.wert)}
              onKeyDown={(event) => filterMitTastatur(event, index)}
              className={cn(
                "min-h-11 rounded-md px-3 text-sm font-medium transition-colors duration-200",
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
