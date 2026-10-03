"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { zeitKandidaten } from "@/lib/arbeitszeit";
import type { ZeitErgebnis } from "@/lib/schema/arbeitszeit";

export function ZeitDialog({ titel, beschreibung, ausloeser, children }: {
  titel: string; beschreibung: string; ausloeser: ReactNode; children: (schliessen: () => void) => ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  return <Dialog.Root open={offen} onOpenChange={setOffen}>
    <Dialog.Trigger asChild>{ausloeser}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Dialog.Content className="fixed inset-x-3 top-1/2 z-50 mx-auto max-h-[calc(100dvh-2rem)] w-auto max-w-xl -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Dialog.Title className="text-xl font-semibold">{titel}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">{beschreibung}</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Dialog schließen"><X aria-hidden="true" /></Button></Dialog.Close>
        </div>
        {children(() => setOffen(false))}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

/** onSubmit erhaelt Eingaben auch nach Serverfehlern, ohne Reacts Action-Reset. */
export function ZeitFormular({ action, nachSpeichern, children, kennung, absendeText = "Speichern" }: {
  action: (fd: FormData) => Promise<ZeitErgebnis>; nachSpeichern: () => void;
  children: (fehler: Record<string, string>) => ReactNode; kennung: string; absendeText?: string;
}) {
  const [ergebnis, setErgebnis] = useState<ZeitErgebnis>({});
  const [laeuft, startTransition] = useTransition();
  const sperre = useRef(false);
  const fehlerRef = useRef<HTMLDivElement>(null);
  function speichern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sperre.current) return;
    sperre.current = true;
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const antwort = await action(fd);
        if (antwort.ok) nachSpeichern();
        else {
          setErgebnis(antwort);
          requestAnimationFrame(() => fehlerRef.current?.focus());
        }
      } catch {
        setErgebnis({ meldung: "Speichern fehlgeschlagen. Bitte Verbindung und Anmeldung prüfen und erneut versuchen." });
        requestAnimationFrame(() => fehlerRef.current?.focus());
      } finally { sperre.current = false; }
    });
  }
  return <form onSubmit={speichern} className="space-y-5" data-aenderungen-warnung={kennung} noValidate>
    {(ergebnis.meldung || ergebnis.fehler) && <div ref={fehlerRef} tabIndex={-1} role="alert" className="rounded-lg border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
      {ergebnis.meldung ?? "Bitte die markierten Eingaben prüfen."}
    </div>}
    <fieldset disabled={laeuft} className="min-w-0 space-y-5">
      {children(ergebnis.fehler ?? {})}
    </fieldset>
    <Button type="submit" laedt={laeuft} className="w-full sm:w-auto">{absendeText}</Button>
  </form>;
}

export function ZeitpunktFeld({ name, label, wert, onChange, vorkommen, setVorkommen, fehler }: {
  name: string; label: string; wert: string; onChange: (v: string) => void;
  vorkommen: string; setVorkommen: (v: string) => void; fehler?: string;
}) {
  const doppelt = zeitKandidaten(wert).length === 2;
  return <div className="space-y-2">
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3">
        <Field id={`${name}-datum`} label="Datum" fehler={fehler}>
          {(p) => <Input {...p} type="date" min="2000-01-01" max="2099-12-31" value={wert.slice(0, 10)} onChange={(e) => onChange(`${e.target.value}T${wert.slice(11) || "00:00"}`)} />}
        </Field>
        <Field id={`${name}-zeit`} label="Uhrzeit">
          {(p) => <Input {...p} type="time" value={wert.slice(11)} onChange={(e) => onChange(`${wert.slice(0, 10)}T${e.target.value}`)} />}
        </Field>
      </div>
    </fieldset>
    <input type="hidden" name={name} value={wert} />
    {doppelt ? <Field id={`${name}-vorkommen`} label="Uhrzeit bei der Zeitumstellung" hilfe="Diese Uhrzeit kommt zweimal vor. Bitte den passenden Zeitpunkt wählen.">
      {(p) => <Select {...p} name={`${name}Vorkommen`} value={vorkommen} onChange={(e) => setVorkommen(e.target.value)}>
        <option value="erstes">Erstes Mal (Sommerzeit, UTC+2)</option>
        <option value="zweites">Zweites Mal (Winterzeit, UTC+1)</option>
      </Select>}
    </Field> : <input type="hidden" name={`${name}Vorkommen`} value="erstes" />}
  </div>;
}
