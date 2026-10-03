"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { arbeitszeitVorgabeSpeichern } from "@/actions/arbeitszeit";
import { datumText, minutenText, WOCHENTAGE, type ZeitVorgabe } from "@/lib/arbeitszeit";
import { ZeitDialog, ZeitFormular } from "./zeit-formular";

export type VorgabeAnsicht = ZeitVorgabe & { id: string; version: number };

export function VorgabenKnopf({ vorgabe, heute, bearbeiten = false }: { vorgabe: ZeitVorgabe | VorgabeAnsicht; heute: string; bearbeiten?: boolean }) {
  const eintrag = bearbeiten && "id" in vorgabe ? vorgabe : null;
  return <ZeitDialog titel={eintrag ? "Arbeitszeitvorgabe bearbeiten" : "Arbeitszeit konfigurieren"}
    beschreibung="Diese Vorgaben gelten nur für dein Benutzerkonto. Neue Vorgaben ersetzen frühere erst ab ihrem Gültigkeitsdatum."
    ausloeser={<Button type="button" variant={eintrag ? "ghost" : "primary"} size={eintrag ? "icon" : "md"} aria-label={eintrag ? `Vorgabe ab ${datumText(eintrag.abDatum)} bearbeiten` : undefined}>{eintrag ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}{!eintrag && "Neue Vorgabe"}</Button>}>
    {(schliessen) => <ZeitFormular action={arbeitszeitVorgabeSpeichern} nachSpeichern={schliessen} kennung={`zeit-vorgabe-${eintrag?.id ?? "neu"}`} absendeText="Vorgaben speichern">
      {(fehler) => <>
        {eintrag && <><input name="id" type="hidden" value={eintrag.id} /><input name="version" type="hidden" value={eintrag.version} /></>}
        <Field id="abDatum" label="Gültig ab" fehler={fehler.abDatum} hilfe={eintrag ? "Eine Korrektur verändert die Sollzeit dieser Periode. Für einen neuen Zeitraum bitte eine neue Vorgabe anlegen." : "Frühere Zeiträume behalten ihre bisherigen Sollzeiten. Vor der ersten Vorgabe gelten 40 Stunden, Montag bis Freitag."}>
          {(p) => <Input {...p} type="date" name="abDatum" min="2000-01-01" max="2099-12-31" defaultValue={eintrag?.abDatum ?? heute} readOnly={Boolean(eintrag)} />}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="standardBeginn" label="Standard-Arbeitsbeginn" fehler={fehler.standardBeginn}>
            {(p) => <Input {...p} type="time" name="standardBeginn" defaultValue={vorgabe.standardBeginn} />}
          </Field>
          <Field id="standardEnde" label="Standard-Arbeitsende" fehler={fehler.standardEnde}>
            {(p) => <Input {...p} type="time" name="standardEnde" defaultValue={vorgabe.standardEnde} />}
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">Vorlage für nachgetragene Zeiten. Ein Ende vor dem Beginn zählt als Folgetag. Die Stechuhr schlägt immer die aktuelle Uhrzeit vor.</p>
        <Field id="standardPause" label="Standardpause (Minuten)" fehler={fehler.pauseMinuten} hilfe="Wird pro Buchung vorbelegt und beim Ausstempeln bestätigt oder geändert. Bereits gespeicherte Pausen bleiben unverändert.">
          {(p) => <Input {...p} type="number" name="pauseMinuten" min={0} max={1440} step={1} defaultValue={vorgabe.pauseMinuten} />}
        </Field>
        <Field id="wochenStunden" label="Wochenarbeitszeit (Stunden)" fehler={fehler.wochenStunden} hilfe="Netto-Sollzeit ohne Pausen. Unabhängig von der Tagesvorlage.">
          {(p) => <Input {...p} type="number" name="wochenStunden" min={0} max={168} step={0.25} defaultValue={vorgabe.wochenMinuten / 60} />}
        </Field>
        <fieldset className="space-y-2" aria-describedby="arbeitstage-hilfe">
          <legend className="mb-2 text-sm font-medium">Regelmäßige Arbeitstage</legend>
          <div className="flex flex-wrap gap-2">
            {WOCHENTAGE.map((tag, i) => <label key={tag} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border-strong px-3 text-sm has-checked:border-primary has-checked:bg-secondary has-checked:text-on-secondary">
              <input type="checkbox" name="arbeitstage" value={i + 1} defaultChecked={vorgabe.arbeitstage.includes(i + 1)} className="size-4 accent-primary" />{tag}
            </label>)}
          </div>
          <p id="arbeitstage-hilfe" className="text-sm text-muted-foreground">Die Wochenstunden werden gleichmäßig auf diese Tage verteilt. Daraus ergibt sich auch das Monatssoll.</p>
          {fehler.arbeitstage && <p role="alert" className="text-sm text-destructive">{fehler.arbeitstage}</p>}
        </fieldset>
      </>}
    </ZeitFormular>}
  </ZeitDialog>;
}

export function VorgabenListe({ vorgaben, heute }: { vorgaben: VorgabeAnsicht[]; heute: string }) {
  return <div className="divide-y divide-border">
    {vorgaben.map((v) => <div key={v.id} className="flex items-start justify-between gap-3 py-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Ab {datumText(v.abDatum)}{v.abDatum > heute ? " · geplant" : ""}</p>
        <p className="text-sm">{v.standardBeginn}–{v.standardEnde} Uhr · {v.pauseMinuten} Min. Pause</p>
        <p className="text-sm text-muted-foreground">{minutenText(v.wochenMinuten)} pro Woche · {v.arbeitstage.map((t) => WOCHENTAGE[t - 1]).join(", ")}</p>
      </div>
      <VorgabenKnopf vorgabe={v} heute={heute} bearbeiten />
    </div>)}
  </div>;
}
