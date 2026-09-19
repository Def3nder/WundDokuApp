"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Sammelmeldung ueber einem Formular mit Sprungmarken zu den Feldern.
 *
 * Bei einem Formular mit vielen Abschnitten reicht die Meldung am Feld nicht:
 * Wer unten auf "Speichern" drueckt, sieht nicht, dass oben etwas fehlt.
 */
export function FehlerUebersicht({
  fehler,
  titel = "Bitte prüfe die folgenden Angaben",
}: {
  /** Feldname -> Meldung, in der Reihenfolge des Formulars */
  fehler: Record<string, string> | undefined;
  titel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const eintraege = Object.entries(fehler ?? {});

  useEffect(() => {
    if (eintraege.length === 0) return;
    // Fokus auf die Zusammenfassung: Screenreader lesen sie dann vor, und
    // die Tab-Reihenfolge fuehrt von hier direkt zu den Sprungmarken.
    ref.current?.focus();
  }, [eintraege.length]);

  if (eintraege.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
        {titel}
      </p>
      <ul className="mt-2 space-y-1 pl-7">
        {eintraege.map(([feld, meldung]) => (
          <li key={feld}>
            <a
              href={`#${feld}`}
              className="text-sm text-destructive underline underline-offset-2"
              onClick={(e) => {
                // Ohne das landet der Fokus nicht im Feld, sondern nur die
                // Bildlaufposition - der Nutzer muesste erst hinklicken.
                e.preventDefault();
                const ziel = document.getElementById(feld);
                ziel?.scrollIntoView({ block: "center", behavior: "smooth" });
                ziel?.focus({ preventScroll: true });
              }}
            >
              {meldung}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
