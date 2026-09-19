"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Uhrzeit-Auswahl fuer die Schmerzlokalisation.
 *
 * Der Bogen fragt "Auf ___ Uhr" - gemeint ist die Lage am Zifferblatt der
 * Wunde. Ein Zahlenfeld waere hier die schlechtere Uebersetzung: Wer am Bett
 * auf die Wunde schaut, denkt raeumlich, nicht numerisch.
 */
export function Zifferblatt({
  name,
  vorgabe = null,
  fehler,
}: {
  name: string;
  vorgabe?: number | null;
  fehler?: string;
}) {
  const [stunde, setStunde] = useState<number | null>(vorgabe);

  const groesse = 180;
  const mitte = groesse / 2;
  const radius = 66;

  return (
    <div className="space-y-2">
      <div
        id={name}
        tabIndex={-1}
        role="radiogroup"
        aria-label="Lage am Zifferblatt der Wunde"
        className="relative"
        style={{ width: groesse, height: groesse }}
      >
        <svg
          width={groesse}
          height={groesse}
          viewBox={`0 0 ${groesse} ${groesse}`}
          aria-hidden="true"
          className="absolute inset-0"
        >
          <circle
            cx={mitte}
            cy={mitte}
            r={radius + 16}
            fill="var(--surface-muted)"
            stroke="var(--border)"
            strokeWidth={1}
          />
          {stunde != null && (
            <line
              x1={mitte}
              y1={mitte}
              x2={mitte + radius * Math.sin((stunde / 12) * 2 * Math.PI)}
              y2={mitte - radius * Math.cos((stunde / 12) * 2 * Math.PI)}
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}
          <circle cx={mitte} cy={mitte} r={3.5} fill="var(--primary)" />
        </svg>

        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const winkel = (h / 12) * 2 * Math.PI;
          const x = mitte + radius * Math.sin(winkel);
          const y = mitte - radius * Math.cos(winkel);
          const aktiv = stunde === h;

          return (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={aktiv}
              aria-label={`${h} Uhr`}
              onClick={() => setStunde(aktiv ? null : h)}
              // Sichtbar 32 px, aber mit 44 px Tippflaeche - sonst waeren die
              // Zahlen am Tablet nicht treffsicher.
              className={cn(
                "tabular absolute flex size-11 items-center justify-center rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer",
                aktiv
                  ? "bg-primary text-on-primary"
                  : "text-foreground hover:bg-surface",
              )}
              style={{ left: x - 22, top: y - 22 }}
            >
              {h}
            </button>
          );
        })}
      </div>

      <p className="tabular text-sm text-muted-foreground">
        {stunde == null ? "Keine Uhrzeit gewählt" : `Auf ${stunde} Uhr`}
      </p>

      {stunde != null && <input type="hidden" name={name} value={stunde} />}

      {fehler && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fehler}
        </p>
      )}
    </div>
  );
}
