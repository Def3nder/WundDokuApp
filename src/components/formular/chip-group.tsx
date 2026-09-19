"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/enums";

/**
 * Mehrfachauswahl als antippbare Chips statt als Ankreuzliste.
 *
 * Auf dem Bogen sind das lange Spalten kleiner Kaestchen; am Tablet waeren die
 * nicht treffsicher zu bedienen. Jeder Chip ist mindestens 44 px hoch.
 *
 * Die Werte gehen als mehrere gleichnamige Felder ins FormData - deshalb die
 * versteckten Inputs statt eines JSON-Felds.
 */
export function ChipGroup({
  name,
  legende,
  optionen,
  vorgabe = [],
  exklusiv,
  hilfe,
  fehler,
  spalten = "auto",
  onChange,
}: {
  name: string;
  legende: string;
  optionen: readonly Option[];
  vorgabe?: readonly string[];
  /** Dieser Wert schliesst alle anderen aus, z. B. "Unauffällig". */
  exklusiv?: string;
  hilfe?: string;
  fehler?: string;
  spalten?: "auto" | "zwei";
  onChange?: (werte: string[]) => void;
}) {
  const [gewaehlt, setGewaehlt] = useState<string[]>([...vorgabe]);
  const gruppenId = useId();
  const hilfeId = hilfe ? `${gruppenId}-hilfe` : undefined;
  const fehlerId = fehler ? `${gruppenId}-fehler` : undefined;

  function umschalten(wert: string) {
    setGewaehlt((alt) => {
      let neu: string[];
      if (alt.includes(wert)) {
        neu = alt.filter((w) => w !== wert);
      } else if (exklusiv && wert === exklusiv) {
        // "Unauffällig" raeumt die uebrigen Befunde ab.
        neu = [wert];
      } else if (exklusiv) {
        neu = [...alt.filter((w) => w !== exklusiv), wert];
      } else {
        neu = [...alt, wert];
      }
      onChange?.(neu);
      return neu;
    });
  }

  return (
    <fieldset
      aria-describedby={[hilfeId, fehlerId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-2 text-sm font-medium text-foreground">{legende}</legend>

      {hilfe && (
        <p id={hilfeId} className="mb-2 text-sm text-muted-foreground">
          {hilfe}
        </p>
      )}

      <div
        className={cn(
          "flex flex-wrap gap-2",
          spalten === "zwei" && "grid grid-cols-1 sm:grid-cols-2",
        )}
      >
        {optionen.map((o) => {
          const aktiv = gewaehlt.includes(o.wert);
          return (
            <button
              key={o.wert}
              type="button"
              role="checkbox"
              aria-checked={aktiv}
              onClick={() => umschalten(o.wert)}
              className={cn(
                "tippziel inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors duration-200 cursor-pointer",
                aktiv
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border",
                  aktiv ? "border-on-primary/60 bg-on-primary/20" : "border-border-strong",
                )}
              >
                {aktiv && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>

      {gewaehlt.map((wert) => (
        <input key={wert} type="hidden" name={name} value={wert} />
      ))}

      {fehler && (
        <p id={fehlerId} role="alert" className="mt-2 text-sm font-medium text-destructive">
          {fehler}
        </p>
      )}
    </fieldset>
  );
}
