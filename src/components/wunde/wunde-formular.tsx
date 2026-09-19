"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import { Label } from "@/components/ui/label";
import {
  AUSRICHTUNGEN,
  DIAGNOSE_TYPEN,
  KOERPERREGIONEN,
  SEITEN,
  ZEITEINHEITEN,
} from "@/lib/enums";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

export type WundeWerte = {
  bezeichnung: string;
  diagnoseTyp: string;
  diagnoseFreitext: string;
  lokalisationRegion: string;
  lokalisationSeite: string;
  lokalisationAusrichtung: string;
  lokalisationFreitext: string;
  bestehtSeitWert: string;
  bestehtSeitEinheit: string;
  rezidiv: boolean;
  rezidivAnzahl: string;
};

const LEER: WundeWerte = {
  bezeichnung: "",
  diagnoseTyp: "",
  diagnoseFreitext: "",
  lokalisationRegion: "",
  lokalisationSeite: "",
  lokalisationAusrichtung: "",
  lokalisationFreitext: "",
  bestehtSeitWert: "",
  bestehtSeitEinheit: "MONATE",
  rezidiv: false,
  rezidivAnzahl: "",
};

export function WundeFormular({
  action,
  vorgabe = LEER,
  abbrechenNach,
  absendeText = "Speichern",
}: {
  action: (zustand: FormZustand, fd: FormData) => Promise<FormZustand>;
  vorgabe?: WundeWerte;
  abbrechenNach: string;
  absendeText?: string;
}) {
  const [zustand, formAction, laeuft] = useActionState(action, START);
  const [rezidiv, setRezidiv] = useState(vorgabe.rezidiv);

  const w = (feld: keyof WundeWerte) =>
    (zustand.werte?.[feld] as string | undefined) ?? String(vorgabe[feld] ?? "");
  const f = (feld: string) => zustand.fehler?.[feld];

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FehlerUebersicht fehler={zustand.fehler} />

      {zustand.meldung && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {zustand.meldung}
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Diagnose</h2>

          <Field
            id="bezeichnung"
            label="Kurzbezeichnung"
            pflicht
            hilfe="Erscheint in Listen, z. B. „Ulcus cruris links lateral“"
            fehler={f("bezeichnung")}
          >
            {(p) => <Input {...p} name="bezeichnung" defaultValue={w("bezeichnung")} required />}
          </Field>

          <Field id="diagnoseTyp" label="Diagnose" pflicht fehler={f("diagnoseTyp")}>
            {(p) => (
              <Select {...p} name="diagnoseTyp" defaultValue={w("diagnoseTyp")} required>
                <option value="">Bitte auswählen …</option>
                {DIAGNOSE_TYPEN.map((d) => (
                  <option key={d.wert} value={d.wert}>
                    {d.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="diagnoseFreitext"
            label="Ergänzung zur Diagnose"
            hilfe="Ursache, Vorbefunde oder andere Hinweise"
            fehler={f("diagnoseFreitext")}
          >
            {(p) => (
              <Textarea {...p} name="diagnoseFreitext" rows={2} defaultValue={w("diagnoseFreitext")} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Lokalisation</h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="lokalisationRegion" label="Körperregion" fehler={f("lokalisationRegion")}>
              {(p) => (
                <Select {...p} name="lokalisationRegion" defaultValue={w("lokalisationRegion")}>
                  <option value="">Keine Angabe</option>
                  {KOERPERREGIONEN.map((r) => (
                    <option key={r.wert} value={r.wert}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field id="lokalisationSeite" label="Seite" fehler={f("lokalisationSeite")}>
              {(p) => (
                <Select {...p} name="lokalisationSeite" defaultValue={w("lokalisationSeite")}>
                  <option value="">Keine Angabe</option>
                  {SEITEN.map((s) => (
                    <option key={s.wert} value={s.wert}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              id="lokalisationAusrichtung"
              label="Ausrichtung"
              fehler={f("lokalisationAusrichtung")}
            >
              {(p) => (
                <Select
                  {...p}
                  name="lokalisationAusrichtung"
                  defaultValue={w("lokalisationAusrichtung")}
                >
                  <option value="">Keine Angabe</option>
                  {AUSRICHTUNGEN.map((a) => (
                    <option key={a.wert} value={a.wert}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field
            id="lokalisationFreitext"
            label="Genauere Beschreibung"
            hilfe="Ergänzt die Auswahl, z. B. „handbreit oberhalb des Innenknöchels“"
            fehler={f("lokalisationFreitext")}
          >
            {(p) => (
              <Input {...p} name="lokalisationFreitext" defaultValue={w("lokalisationFreitext")} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Verlauf</h2>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium">Wunde besteht seit</legend>
            <div className="flex gap-3">
              <Input
                id="bestehtSeitWert"
                name="bestehtSeitWert"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                defaultValue={w("bestehtSeitWert")}
                aria-label="Dauer"
                aria-invalid={f("bestehtSeitWert") ? true : undefined}
                className="w-28"
              />
              <Select
                id="bestehtSeitEinheit"
                name="bestehtSeitEinheit"
                defaultValue={w("bestehtSeitEinheit")}
                aria-label="Einheit"
                aria-invalid={f("bestehtSeitEinheit") ? true : undefined}
                className="w-40"
              >
                {ZEITEINHEITEN.map((z) => (
                  <option key={z.wert} value={z.wert}>
                    {z.label}
                  </option>
                ))}
              </Select>
            </div>
            {(f("bestehtSeitWert") || f("bestehtSeitEinheit")) && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {f("bestehtSeitWert") ?? f("bestehtSeitEinheit")}
              </p>
            )}
          </fieldset>

          <div className="space-y-3">
            <label className="tippziel flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="rezidiv"
                checked={rezidiv}
                onChange={(e) => setRezidiv(e.target.checked)}
                className="size-5 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-sm font-medium">Rezidiv</span>
            </label>

            {/* Erst zeigen, wenn es etwas zu zaehlen gibt. */}
            {rezidiv && (
              <Field
                id="rezidivAnzahl"
                label="Anzahl der Rezidive"
                fehler={f("rezidivAnzahl")}
                className="max-w-40"
              >
                {(p) => (
                  <Input
                    {...p}
                    name="rezidivAnzahl"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    defaultValue={w("rezidivAnzahl")}
                  />
                )}
              </Field>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" laedt={laeuft}>
          {absendeText}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={abbrechenNach}>Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
