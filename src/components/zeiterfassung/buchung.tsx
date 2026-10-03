"use client";

import { useEffect, useState } from "react";
import { Clock3, LogIn, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { arbeitszeitLoeschen, arbeitszeitSpeichern } from "@/actions/arbeitszeit";
import { datumPlus, lokaleZeit, minutenText, vorkommenVon, zeitText, type ZeitVorgabe } from "@/lib/arbeitszeit";
import { ZeitDialog, ZeitFormular, ZeitpunktFeld } from "./zeit-formular";

export type BuchungAnsicht = {
  id: string; beginn: string; ende: string | null; pauseMinuten: number; notiz: string; version: number;
};

function BuchungsFormular({ eintrag, modus, vorgabe, schliessen }: {
  eintrag?: BuchungAnsicht; modus: "start" | "stop" | "neu" | "edit"; vorgabe: ZeitVorgabe; schliessen: () => void;
}) {
  const [jetzt] = useState(() => new Date());
  const [beginn, setBeginn] = useState(() => eintrag ? lokaleZeit(new Date(eintrag.beginn)) : modus === "neu" ? `${lokaleZeit(jetzt).slice(0, 10)}T${vorgabe.standardBeginn}` : lokaleZeit(jetzt));
  const [ende, setEnde] = useState(() => {
    if (eintrag?.ende) return lokaleZeit(new Date(eintrag.ende));
    if (modus === "neu") {
      const tag = lokaleZeit(jetzt).slice(0, 10);
      return `${vorgabe.standardEnde <= vorgabe.standardBeginn ? datumPlus(tag, 1) : tag}T${vorgabe.standardEnde}`;
    }
    return lokaleZeit(jetzt);
  });
  const [beginnVorkommen, setBeginnVorkommen] = useState(eintrag ? vorkommenVon(new Date(eintrag.beginn)) : vorkommenVon(new Date(Math.floor(jetzt.getTime() / 60_000) * 60_000)) as string);
  const [endeVorkommen, setEndeVorkommen] = useState(eintrag?.ende ? vorkommenVon(new Date(eintrag.ende)) : vorkommenVon(new Date(Math.floor(jetzt.getTime() / 60_000) * 60_000)) as string);
  const hatEnde = modus === "stop" || modus === "neu" || Boolean(eintrag?.ende);
  return <ZeitFormular action={arbeitszeitSpeichern} nachSpeichern={schliessen} kennung={`zeit-${eintrag?.id ?? modus}`} absendeText={modus === "start" ? "Einstempeln speichern" : modus === "stop" ? "Ausstempeln speichern" : "Zeiteintrag speichern"}>
    {(fehler) => <>
      {eintrag && <><input type="hidden" name="id" value={eintrag.id} /><input type="hidden" name="version" value={eintrag.version} /></>}
      <ZeitpunktFeld name="beginn" label="Arbeitsbeginn" wert={beginn} onChange={setBeginn} vorkommen={beginnVorkommen} setVorkommen={setBeginnVorkommen} fehler={fehler.beginn} />
      {hatEnde ? <ZeitpunktFeld name="ende" label="Arbeitsende" wert={ende} onChange={setEnde} vorkommen={endeVorkommen} setVorkommen={setEndeVorkommen} fehler={fehler.ende} /> : <input type="hidden" name="ende" value="" />}
      <Field id="pauseMinuten" label="Pause (Minuten)" fehler={fehler.pauseMinuten} hilfe={hatEnde ? "Wird von der Anwesenheitszeit abgezogen. Bei mehreren Buchungen die Pause nur einmal eintragen." : "Vorgemerkt für diese Buchung; beim Ausstempeln an die tatsächliche Pause anpassen."}>
        {(p) => <Input {...p} name="pauseMinuten" type="number" min={0} max={1440} step={1} defaultValue={eintrag?.pauseMinuten ?? vorgabe.pauseMinuten} />}
      </Field>
      <Field id="zeit-notiz" label="Notiz (optional)" fehler={fehler.notiz}>
        {(p) => <Textarea {...p} name="notiz" maxLength={500} defaultValue={eintrag?.notiz ?? ""} placeholder="Zum Beispiel: Dienstbesprechung" />}
      </Field>
    </>}
  </ZeitFormular>;
}

export function BuchungKnopf({ eintrag, modus, vorgabe }: { eintrag?: BuchungAnsicht; modus: "start" | "stop" | "neu" | "edit"; vorgabe: ZeitVorgabe }) {
  const titel = { start: "Einstempeln", stop: "Ausstempeln", neu: "Zeit nachtragen", edit: "Zeiteintrag bearbeiten" }[modus];
  const Icon = { start: LogIn, stop: LogOut, neu: Plus, edit: Pencil }[modus];
  return <ZeitDialog titel={titel} beschreibung="Datum und Uhrzeit vor dem Speichern prüfen und bei Bedarf ändern. Alle Zeiten gelten für Europe/Berlin."
    ausloeser={<Button type="button" variant={modus === "edit" ? "ghost" : modus === "neu" ? "outline" : "primary"} size={modus === "edit" ? "icon" : "md"} aria-label={modus === "edit" ? `${titel}: ${zeitText(new Date(eintrag!.beginn))}` : undefined}><Icon aria-hidden="true" />{modus !== "edit" && titel}</Button>}>
    {(schliessen) => <BuchungsFormular eintrag={eintrag} modus={modus} vorgabe={vorgabe} schliessen={schliessen} />}
  </ZeitDialog>;
}

export function BuchungLoeschen({ eintrag }: { eintrag: BuchungAnsicht }) {
  return <ZeitDialog titel="Zeiteintrag löschen" beschreibung={`Buchung vom ${zeitText(new Date(eintrag.beginn))} aus der Auswertung entfernen?`}
    ausloeser={<Button type="button" variant="ghost" size="icon" aria-label={`Zeiteintrag löschen: ${zeitText(new Date(eintrag.beginn))}`}><Trash2 aria-hidden="true" /></Button>}>
    {(schliessen) => <ZeitFormular action={arbeitszeitLoeschen} nachSpeichern={schliessen} kennung="zeit-loeschen" absendeText="Zeiteintrag löschen">
      {() => <><input type="hidden" name="id" value={eintrag.id} /><input type="hidden" name="version" value={eintrag.version} /><p className="text-sm text-muted-foreground">Der Eintrag bleibt im Änderungsprotokoll nachvollziehbar.</p></>}
    </ZeitFormular>}
  </ZeitDialog>;
}

export function LaufendeZeit({ beginn, serverJetzt }: { beginn: string; serverJetzt: string }) {
  const [jetzt, setJetzt] = useState(new Date(serverJetzt).getTime());
  useEffect(() => { setJetzt(Date.now()); const timer = setInterval(() => setJetzt(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  const minuten = Math.max(0, Math.floor((jetzt - new Date(beginn).getTime()) / 60_000));
  return <div className="space-y-2">
    <p className="flex items-center gap-2 text-sm font-medium text-accent"><Clock3 className="size-4" aria-hidden="true" />Stechuhr läuft</p>
    <p className="tabular text-4xl font-semibold tracking-tight">{minutenText(minuten)}</p>
    <p className="text-sm text-muted-foreground">Anwesenheit seit {zeitText(new Date(beginn))}, vor Pausenabzug</p>
    {minuten >= 720 && <p role="status" className="text-sm font-medium text-destructive">Seit über 12 Stunden eingestempelt. Bitte prüfen, ob das Ausstempeln vergessen wurde.</p>}
  </div>;
}
