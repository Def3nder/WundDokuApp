"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/enums";

/**
 * Einfachauswahl als Chips. Ein erneuter Tipp auf die aktive Option hebt die
 * Auswahl auf - auf Papier kann man ein Kreuz auch wieder durchstreichen,
 * und ohne das waere eine versehentliche Angabe nicht mehr zu entfernen.
 */
export function RadioChips({
  name,
  legende,
  optionen,
  vorgabe = null,
  hilfe,
  fehler,
  abwaehlbar = true,
  onChange,
}: {
  name: string;
  legende: string;
  optionen: readonly Option[];
  vorgabe?: string | null;
  hilfe?: string;
  fehler?: string;
  abwaehlbar?: boolean;
  onChange?: (wert: string | null) => void;
}) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(vorgabe);
  const gruppenId = useId();
  const hilfeId = hilfe ? `${gruppenId}-hilfe` : undefined;
  const fehlerId = fehler ? `${gruppenId}-fehler` : undefined;

  function waehlen(wert: string) {
    const neu = abwaehlbar && gewaehlt === wert ? null : wert;
    setGewaehlt(neu);
    onChange?.(neu);
  }

  return (
    <fieldset
      id={name}
      tabIndex={-1}
      role="radiogroup"
      aria-describedby={[hilfeId, fehlerId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-2 text-sm font-medium text-foreground">{legende}</legend>

      {hilfe && (
        <p id={hilfeId} className="mb-2 text-sm text-muted-foreground">
          {hilfe}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {optionen.map((o) => {
          const aktiv = gewaehlt === o.wert;
          return (
            <button
              key={o.wert}
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => waehlen(o.wert)}
              className={cn(
                "tippziel rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                aktiv
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {gewaehlt && <input type="hidden" name={name} value={gewaehlt} />}

      {fehler && (
        <p id={fehlerId} role="alert" className="mt-2 text-sm font-medium text-destructive">
          {fehler}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Ja/Nein wie auf dem Bogen - zwei Kaestchen, nicht ein Schalter.
 *
 * Bewusst dreiwertig: "noch nicht beantwortet" ist etwas anderes als "nein".
 * Beim Speichern wird nur "ja" als true gewertet.
 */
export function JaNein({
  name,
  legende,
  vorgabe = null,
  hilfe,
  fehler,
  onChange,
  children,
}: {
  name: string;
  legende: string;
  vorgabe?: boolean | null;
  hilfe?: string;
  fehler?: string;
  onChange?: (wert: boolean | null) => void;
  /** Wird nur bei "Ja" angezeigt - z. B. das VAS-Feld. */
  children?: React.ReactNode;
}) {
  const [wert, setWert] = useState<boolean | null>(vorgabe);
  const gruppenId = useId();
  const hilfeId = hilfe ? `${gruppenId}-hilfe` : undefined;

  function waehlen(neu: boolean) {
    const ergebnis = wert === neu ? null : neu;
    setWert(ergebnis);
    onChange?.(ergebnis);
  }

  return (
    <div className="space-y-3">
      <fieldset id={name} tabIndex={-1} role="radiogroup" aria-describedby={hilfeId}>
        <legend className="mb-2 text-sm font-medium text-foreground">{legende}</legend>

        {hilfe && (
          <p id={hilfeId} className="mb-2 text-sm text-muted-foreground">
            {hilfe}
          </p>
        )}

        <div className="flex gap-2">
          {[
            { v: false, label: "Nein" },
            { v: true, label: "Ja" },
          ].map(({ v, label }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={wert === v}
              onClick={() => waehlen(v)}
              className={cn(
                "tippziel min-w-20 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
                wert === v
                  ? v
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-strong bg-surface-muted text-foreground"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <input type="hidden" name={name} value={wert === true ? "ja" : "nein"} />

        {fehler && (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {fehler}
          </p>
        )}
      </fieldset>

      {wert === true && children}
    </div>
  );
}
