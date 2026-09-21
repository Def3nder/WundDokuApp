"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AbschnittDef = {
  id: string;
  titel: string;
  beschreibung?: string;
};

/**
 * Ein aufklappbarer Abschnitt des Aufnahmeformulars.
 *
 * Bewusst kein Wizard: Alle Abschnitte liegen auf einer Seite und in einem
 * Formular. Wer beim Verbandwechsel merkt, dass die Wundgroesse anders ist als
 * gedacht, soll zurueckspringen koennen, ohne Eingaben zu verlieren.
 *
 * Eingeklappte Abschnitte bleiben im DOM (nur ausgeblendet), damit ihre Werte
 * beim Absenden mitgehen.
 */
export function Abschnitt({
  nummer,
  def,
  offenVorgabe = true,
  hatFehler,
  children,
}: {
  nummer: number;
  def: AbschnittDef;
  offenVorgabe?: boolean;
  hatFehler?: boolean;
  children: React.ReactNode;
}) {
  // Ein Abschnitt mit Fehlern klappt auf, sonst findet man die Meldung nicht.
  const [offen, setOffen] = useState(offenVorgabe || hatFehler);

  useEffect(() => {
    if (hatFehler) setOffen(true);
  }, [hatFehler]);

  return (
    <section
      id={def.id}
      className={cn(
        "form-section min-w-0 rounded-xl border bg-card shadow-sm",
        hatFehler ? "border-destructive/50" : "border-border",
      )}
    >
      <h2>
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls={`${def.id}-inhalt`}
          className="card-header flex w-full items-center gap-3 rounded-xl text-left cursor-pointer"
        >
          <span
            aria-hidden="true"
            className={cn(
              "tabular flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              hatFehler
                ? "bg-destructive text-on-destructive"
                : "bg-secondary text-on-secondary",
            )}
          >
            {nummer}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-heading text-base font-semibold text-heading">
              {def.titel}
            </span>
            {def.beschreibung && (
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                {def.beschreibung}
              </span>
            )}
          </span>

          {hatFehler && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              Prüfen
            </span>
          )}

          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              offen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </h2>

      <div
        id={`${def.id}-inhalt`}
        // hidden statt Ausbauen: die Felder muessen im Formular bleiben.
        hidden={!offen}
        className="card-content min-w-0 space-y-6 border-t border-border"
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Sprungleiste ueber dem Formular.
 *
 * Zeigt, wie weit man ist, und erlaubt den direkten Sprung - bei sechs
 * Abschnitten mit zusammen ~180 Feldern ist Scrollen allein zu muehsam.
 */
export function AbschnittsNavigation({
  abschnitte,
  fehlerhafte,
}: {
  abschnitte: readonly AbschnittDef[];
  fehlerhafte: ReadonlySet<string>;
}) {
  return (
    <nav
      aria-label="Abschnitte"
      className="section-navigation sticky z-30 overflow-x-auto overscroll-x-contain border-b border-border bg-background/95 py-2 backdrop-blur"
    >
      <ol className="flex gap-1">
        {abschnitte.map((a, i) => {
          const fehler = fehlerhafte.has(a.id);
          return (
            <li key={a.id}>
              <a
                href={`#${a.id}`}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-200",
                  fehler
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <span className="tabular" aria-hidden="true">
                  {i + 1}
                </span>
                {a.titel}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
