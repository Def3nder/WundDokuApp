"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { VAS_MAX, VAS_MIN } from "@/lib/enums";

/** Ankertexte der VAS - hilft, den Wert einzuordnen. */
const ANKER: Record<number, string> = {
  0: "kein Schmerz",
  3: "leicht",
  5: "mäßig",
  7: "stark",
  10: "stärkster vorstellbarer Schmerz",
};

function farbeFuer(wert: number): string {
  if (wert <= 3) return "var(--status-gut)";
  if (wert <= 6) return "var(--status-mittel)";
  return "var(--status-schlecht)";
}

/**
 * Schmerzskala 0-10 (VAS/NRS).
 *
 * Schieberegler plus antippbare Zahlenleiste: Der Regler ist schnell, die
 * Zahlen sind genau. Am Bett wird meist die Zahl genannt, die der Patient
 * sagt - die soll man direkt treffen koennen.
 */
export function VasSlider({
  name,
  label,
  vorgabe = null,
  fehler,
}: {
  name: string;
  label: string;
  vorgabe?: number | null;
  fehler?: string;
}) {
  const [wert, setWert] = useState<number | null>(vorgabe);
  const beschreibungId = `${name}-beschreibung`;

  const anzeige = wert ?? 0;
  const farbe = wert == null ? "var(--border-strong)" : farbeFuer(wert);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="tabular text-sm font-semibold" style={{ color: farbe }}>
          {wert == null ? "nicht angegeben" : `${wert} / ${VAS_MAX}`}
        </span>
      </div>

      <input
        id={name}
        type="range"
        min={VAS_MIN}
        max={VAS_MAX}
        step={1}
        value={anzeige}
        onChange={(e) => setWert(Number(e.target.value))}
        aria-describedby={beschreibungId}
        aria-valuetext={wert == null ? "nicht angegeben" : `${wert} von ${VAS_MAX}`}
        className="vas-slider h-11 w-full cursor-pointer appearance-none bg-transparent"
        style={{ color: farbe }}
      />

      {/* Zahlenleiste: jede Zahl direkt antippbar */}
      <div className="vas-values">
        {Array.from({ length: VAS_MAX - VAS_MIN + 1 }, (_, i) => i + VAS_MIN).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={ANKER[n] ? `${n} – ${ANKER[n]}` : String(n)}
            aria-pressed={wert === n}
            onClick={() => setWert(wert === n ? null : n)}
            className={cn(
              "tabular flex min-h-11 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer",
              wert === n
                ? "text-on-primary"
                : "bg-surface-muted text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
            style={wert === n ? { backgroundColor: farbe } : undefined}
          >
            {n}
          </button>
        ))}
      </div>

      <p id={beschreibungId} className="flex justify-between text-xs text-muted-foreground">
        <span>0 – kein Schmerz</span>
        <span className="text-right">10 – stärkster Schmerz</span>
      </p>

      {wert != null && <input type="hidden" name={name} value={wert} />}

      {fehler && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fehler}
        </p>
      )}
    </div>
  );
}
