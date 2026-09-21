"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { fokussiereRadio, radioZielIndex } from "@/lib/tastatur";
import {
  filtereVersorgungspartner,
  NEUER_STAMMDATENSATZ,
  type VersorgungspartnerOption,
} from "@/lib/versorgungspartner";

type EingabeProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

function naechstesFormularfeld(ausloeser: HTMLInputElement): HTMLElement | null {
  const formular = ausloeser.form;
  if (!formular) return null;

  const felder = Array.from(
    formular.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])',
    ),
  ).filter((feld) => feld.tabIndex >= 0 && feld.getClientRects().length > 0);
  const index = felder.indexOf(ausloeser);
  return index >= 0 ? (felder[index + 1] ?? null) : null;
}

export function StammdatenSuche({
  eingabeProps,
  name,
  wert,
  onWertAendern,
  optionen,
  platzhalter,
  gruppenLabel,
  keineAuswahlText,
  neuText,
}: {
  eingabeProps: EingabeProps;
  name: string;
  wert: string;
  onWertAendern: (wert: string) => void;
  optionen: readonly VersorgungspartnerOption[];
  platzhalter: string;
  gruppenLabel: string;
  keineAuswahlText?: string;
  neuText?: string;
}) {
  const [suche, setSuche] = useState("");
  const basisId = useId();
  const ergebnisId = `${basisId}-ergebnisse`;
  const statusId = `${basisId}-status`;
  const gefiltert = useMemo(
    () => filtereVersorgungspartner(optionen, suche),
    [optionen, suche],
  );
  const hatSuchtext = suche.trim().length > 0;
  const ausgewaehlt = optionen.find((option) => option.id === wert);
  const auswahlOptionen = [
    ...(keineAuswahlText && !hatSuchtext ? [{ id: "", name: keineAuswahlText }] : []),
    ...gefiltert,
  ];
  const sichtbareAuswahl = auswahlOptionen.some((option) => option.id === wert);

  function waehlen(neuerWert: string) {
    onWertAendern(neuerWert);
  }

  function mitTastatur(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const ziel = radioZielIndex(event.key, index, auswahlOptionen.length);
    if (ziel == null) return;
    event.preventDefault();
    const ausloeser = event.currentTarget;
    waehlen(auswahlOptionen[ziel].id);
    requestAnimationFrame(() => fokussiereRadio(ausloeser, ziel));
  }

  function fokussiereErsteOption() {
    document
      .getElementById(ergebnisId)
      ?.querySelector<HTMLElement>('[role="radio"]')
      ?.focus();
  }

  function sucheMitTastatur(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && auswahlOptionen.length > 0) {
      event.preventDefault();
      fokussiereErsteOption();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (hatSuchtext && gefiltert.length === 1) waehlen(gefiltert[0].id);
      return;
    }

    if (event.key !== "Tab" || event.shiftKey) return;

    if (auswahlOptionen.length > 1) {
      event.preventDefault();
      waehlen(auswahlOptionen[0].id);
      requestAnimationFrame(() => fokussiereErsteOption());
      return;
    }

    const naechstesFeld = naechstesFormularfeld(event.currentTarget);
    if (!naechstesFeld) return;
    event.preventDefault();
    if (hatSuchtext && gefiltert.length === 1) waehlen(gefiltert[0].id);
    requestAnimationFrame(() => naechstesFeld.focus());
  }

  return (
    <div className="space-y-2.5">
      <input type="hidden" name={name} value={wert} />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          {...eingabeProps}
          type="search"
          value={suche}
          onChange={(event) => setSuche(event.target.value)}
          onKeyDown={sucheMitTastatur}
          placeholder={platzhalter}
          autoComplete="off"
          aria-controls={ergebnisId}
          aria-describedby={
            [eingabeProps["aria-describedby"], statusId].filter(Boolean).join(" ") || undefined
          }
              className="pl-10 pr-12"
        />
        {suche && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setSuche("")}
            aria-label="Suche leeren"
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div id={statusId} className="flex min-h-5 flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground" aria-live="polite">
          {gefiltert.length === 0
            ? "Keine Treffer"
            : gefiltert.length === 1
              ? "1 Treffer · Enter wählt aus, Tab übernimmt und geht weiter"
              : `${gefiltert.length} Treffer · Tab oder Pfeil nach unten öffnet die Auswahl`}
        </span>
        {wert === NEUER_STAMMDATENSATZ ? (
          <span className="font-medium text-primary">Neuer Eintrag</span>
        ) : ausgewaehlt ? (
          <span className="min-w-0 font-medium text-foreground">
            Ausgewählt: {ausgewaehlt.name}
          </span>
        ) : null}
      </div>

      <div
        id={ergebnisId}
        role="radiogroup"
        aria-label={gruppenLabel}
        className="max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-surface shadow-sm"
      >
        {auswahlOptionen.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-muted-foreground">
            Keine passenden Einträge gefunden
          </div>
        ) : (
          auswahlOptionen.map((option, index) => {
            const aktiv = option.id === wert;
            return (
              <button
                key={option.id || "__LEER__"}
                type="button"
                role="radio"
                aria-checked={aktiv}
                tabIndex={aktiv || (!sichtbareAuswahl && index === 0) ? 0 : -1}
                onClick={() => waehlen(option.id)}
                onKeyDown={(event) => mitTastatur(event, index)}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-surface-muted focus-visible:relative focus-visible:z-10",
                  aktiv && "bg-secondary/70 text-on-secondary",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-input",
                    aktiv && "border-primary bg-primary text-on-primary",
                  )}
                  aria-hidden="true"
                >
                  {aktiv && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{option.name}</span>
                  {option.zusatz && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.zusatz}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {neuText && (
        <button
          type="button"
          onClick={() => waehlen(NEUER_STAMMDATENSATZ)}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5",
            wert === NEUER_STAMMDATENSATZ && "border-solid bg-primary/10",
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          {neuText}
        </button>
      )}
    </div>
  );
}
