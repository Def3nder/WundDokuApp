"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

export type PatientWerte = {
  nachname: string;
  vorname: string;
  geburtsdatum: string;
  patientennummer: string;
  arztTherapieverantwortlich: string;
  notizen: string;
};

const LEER: PatientWerte = {
  nachname: "",
  vorname: "",
  geburtsdatum: "",
  patientennummer: "",
  arztTherapieverantwortlich: "",
  notizen: "",
};

export function PatientFormular({
  action,
  vorgabe = LEER,
  abbrechenNach,
  absendeText = "Speichern",
}: {
  action: (zustand: FormZustand, fd: FormData) => Promise<FormZustand>;
  vorgabe?: PatientWerte;
  abbrechenNach: string;
  absendeText?: string;
}) {
  const [zustand, formAction, laeuft] = useActionState(action, START);

  // Nach einem Fehler die getippten Werte behalten, sonst die Vorgabe.
  const w = (feld: keyof PatientWerte) => zustand.werte?.[feld] ?? vorgabe[feld];
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="nachname" label="Nachname" pflicht fehler={f("nachname")}>
              {(p) => (
                <Input {...p} name="nachname" defaultValue={w("nachname")} autoComplete="family-name" required />
              )}
            </Field>

            <Field id="vorname" label="Vorname" pflicht fehler={f("vorname")}>
              {(p) => (
                <Input {...p} name="vorname" defaultValue={w("vorname")} autoComplete="given-name" required />
              )}
            </Field>

            <Field
              id="geburtsdatum"
              label="Geburtsdatum"
              pflicht
              fehler={f("geburtsdatum")}
            >
              {(p) => (
                <Input
                  {...p}
                  name="geburtsdatum"
                  type="date"
                  defaultValue={w("geburtsdatum")}
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
              )}
            </Field>

            <Field
              id="patientennummer"
              label="Patientennummer"
              pflicht
              hilfe="Muss eindeutig sein"
              fehler={f("patientennummer")}
            >
              {(p) => (
                <Input {...p} name="patientennummer" defaultValue={w("patientennummer")} required />
              )}
            </Field>
          </div>

          <Field
            id="arztTherapieverantwortlich"
            label="Therapieverantwortlicher Arzt"
            fehler={f("arztTherapieverantwortlich")}
          >
            {(p) => (
              <Input
                {...p}
                name="arztTherapieverantwortlich"
                defaultValue={w("arztTherapieverantwortlich")}
              />
            )}
          </Field>

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
