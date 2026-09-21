"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import { StammdatenSuche } from "@/components/formular/stammdaten-suche";
import { NEUER_STAMMDATENSATZ } from "@/lib/versorgungspartner";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

export type PatientWerte = {
  nachname: string;
  vorname: string;
  geburtsdatum: string;
  patientennummer: string;
  arztId: string;
  neuerArztName: string;
  neueArztPraxis: string;
  pflegedienstId: string;
  neuerPflegedienstName: string;
  neuerPflegedienstAnsprechpartner: string;
  notizen: string;
};

type ArztOption = { id: string; name: string; praxis: string | null };
type PflegedienstOption = { id: string; name: string; ansprechpartner: string | null };

const LEER: PatientWerte = {
  nachname: "",
  vorname: "",
  geburtsdatum: "",
  patientennummer: "",
  arztId: "",
  neuerArztName: "",
  neueArztPraxis: "",
  pflegedienstId: "",
  neuerPflegedienstName: "",
  neuerPflegedienstAnsprechpartner: "",
  notizen: "",
};

export function PatientFormular({
  action,
  vorgabe = LEER,
  abbrechenNach,
  absendeText = "Speichern",
  aerzte,
  pflegedienste,
}: {
  action: (zustand: FormZustand, fd: FormData) => Promise<FormZustand>;
  vorgabe?: PatientWerte;
  abbrechenNach: string;
  absendeText?: string;
  aerzte: ArztOption[];
  pflegedienste: PflegedienstOption[];
}) {
  const [zustand, formAction, laeuft] = useActionState(action, START);

  // Nach einem Fehler die getippten Werte behalten, sonst die Vorgabe.
  const w = (feld: keyof PatientWerte) => zustand.werte?.[feld] ?? vorgabe[feld];
  const f = (feld: string) => zustand.fehler?.[feld];
  const [arztAuswahl, setArztAuswahl] = useState(w("arztId"));
  const [pflegedienstAuswahl, setPflegedienstAuswahl] = useState(w("pflegedienstId"));

  return (
    <form
      action={formAction}
      className="space-y-6"
      data-aenderungen-warnung="patient"
      noValidate
    >
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
          <h2 className="text-base font-semibold">Patientendaten</h2>
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <Field id="nachname" label="Nachname" pflicht fehler={f("nachname")} className="min-w-0">
              {(p) => (
                <Input {...p} className="h-11" name="nachname" defaultValue={w("nachname")} autoComplete="family-name" required />
              )}
            </Field>

            <Field id="vorname" label="Vorname" pflicht fehler={f("vorname")} className="min-w-0">
              {(p) => (
                <Input {...p} className="h-11" name="vorname" defaultValue={w("vorname")} autoComplete="given-name" required />
              )}
            </Field>

            <Field
              id="geburtsdatum"
              label="Geburtsdatum"
              pflicht
              fehler={f("geburtsdatum")}
              className="min-w-0"
            >
              {(p) => (
                <span className="ipad-datumsrahmen">
                  <Input
                    {...p}
                    className="ipad-datumsfeld"
                    name="geburtsdatum"
                    type="date"
                    defaultValue={w("geburtsdatum")}
                    max={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </span>
              )}
            </Field>

            <Field
              id="patientennummer"
              label="Patientennummer"
              pflicht
              hilfe="Muss eindeutig sein"
              fehler={f("patientennummer")}
              className="min-w-0"
            >
              {(p) => (
                <Input {...p} className="h-11" name="patientennummer" defaultValue={w("patientennummer")} required />
              )}
            </Field>
          </div>

          <div className="space-y-5 border-t border-border pt-5">
            <h2 className="text-base font-semibold">Versorgungspartner</h2>
            <div className="grid items-start gap-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <Field id="arztId" label="Therapieverantwortlicher Arzt" pflicht fehler={f("arztId")}>
                {(p) => (
                  <StammdatenSuche
                    eingabeProps={p}
                    name="arztId"
                    wert={arztAuswahl}
                    onWertAendern={setArztAuswahl}
                    optionen={aerzte.map((arzt) => ({
                      id: arzt.id,
                      name: arzt.name,
                      zusatz: arzt.praxis,
                    }))}
                    platzhalter="Arzt suchen, z. B. Name oder Titel"
                    gruppenLabel="Therapieverantwortlichen Arzt auswählen"
                    neuText="Neuen Arzt anlegen"
                  />
                )}
              </Field>
              {arztAuswahl === NEUER_STAMMDATENSATZ && (
                <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <p className="text-sm font-medium">Neuen zentralen Arzt anlegen</p>
                  <Field id="neuerArztName" label="Name" pflicht fehler={f("neuerArztName")}>
                    {(p) => <Input {...p} className="h-11" name="neuerArztName" defaultValue={w("neuerArztName")} required />}
                  </Field>
                  <Field id="neueArztPraxis" label="Praxis" fehler={f("neueArztPraxis")}>
                    {(p) => <Input {...p} className="h-11" name="neueArztPraxis" defaultValue={w("neueArztPraxis")} />}
                  </Field>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <Field id="pflegedienstId" label="Pflegedienst" fehler={f("pflegedienstId")}>
                {(p) => (
                  <StammdatenSuche
                    eingabeProps={p}
                    name="pflegedienstId"
                    wert={pflegedienstAuswahl}
                    onWertAendern={setPflegedienstAuswahl}
                    optionen={pflegedienste.map((dienst) => ({
                      id: dienst.id,
                      name: dienst.name,
                      zusatz: dienst.ansprechpartner
                        ? `Ansprechpartner: ${dienst.ansprechpartner}`
                        : null,
                    }))}
                    platzhalter="Pflegedienst oder Ansprechpartner suchen"
                    gruppenLabel="Pflegedienst auswählen"
                    keineAuswahlText="Kein Pflegedienst"
                    neuText="Neuen Pflegedienst anlegen"
                  />
                )}
              </Field>
              {pflegedienstAuswahl === NEUER_STAMMDATENSATZ && (
                <div className="space-y-3 rounded-lg border border-accent/25 bg-accent/5 p-3">
                  <p className="text-sm font-medium">Neuen zentralen Pflegedienst anlegen</p>
                  <Field id="neuerPflegedienstName" label="Name" pflicht fehler={f("neuerPflegedienstName")}>
                    {(p) => <Input {...p} className="h-11" name="neuerPflegedienstName" defaultValue={w("neuerPflegedienstName")} required />}
                  </Field>
                  <Field id="neuerPflegedienstAnsprechpartner" label="Ansprechpartner" fehler={f("neuerPflegedienstAnsprechpartner")}>
                    {(p) => <Input {...p} className="h-11" name="neuerPflegedienstAnsprechpartner" defaultValue={w("neuerPflegedienstAnsprechpartner")} />}
                  </Field>
                </div>
              )}
            </div>
          </div>
          </div>

          <Field
            id="notizen"
            label="Notizen"
            hilfe="Allgemeine Hinweise zum Patienten, nicht zur einzelnen Wunde"
            fehler={f("notizen")}
          >
            {(p) => <Textarea {...p} name="notizen" rows={4} defaultValue={w("notizen")} />}
          </Field>
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
