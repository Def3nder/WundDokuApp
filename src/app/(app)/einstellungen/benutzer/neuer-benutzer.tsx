"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import { benutzerAnlegen } from "@/actions/benutzer";
import { ROLLEN } from "@/lib/enums";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

export function NeuerBenutzer({ abbrechenNach }: { abbrechenNach: string }) {
  const [zustand, formAction, laeuft] = useActionState(benutzerAnlegen, START);

  const w = (feld: string) => zustand.werte?.[feld] ?? "";
  const f = (feld: string) => zustand.fehler?.[feld];

  // Nach jedem Absenden (auch bei einem Fehler) setzt React/Next.js das
  // <select>-Element auf seinen Ursprungszustand zurueck, ohne dass React
  // das bei einem unveraenderten defaultValue bemerkt - siehe dieselbe
  // Anmerkung in wunde-formular.tsx. Ein wechselnder `key` auf dem <form>
  // erzwingt bei jedem neuen `zustand` einen echten Neuaufbau.
  const zustandGeneration = useRef(0);
  const vorherigerZustand = useRef(zustand);
  if (vorherigerZustand.current !== zustand) {
    zustandGeneration.current += 1;
    vorherigerZustand.current = zustand;
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <form key={zustandGeneration.current} action={formAction} className="space-y-5" noValidate>
          <FehlerUebersicht fehler={zustand.fehler} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Name" pflicht fehler={f("name")}>
              {(p) => <Input {...p} name="name" defaultValue={w("name")} required />}
            </Field>

            <Field
              id="handzeichen"
              label="Handzeichen"
              pflicht
              hilfe="Kürzel auf dem Dokumentationsbogen, höchstens 6 Zeichen"
              fehler={f("handzeichen")}
            >
              {(p) => (
                <Input {...p} name="handzeichen" maxLength={6} defaultValue={w("handzeichen")} required />
              )}
            </Field>

            <Field id="email" label="E-Mail" pflicht fehler={f("email")}>
              {(p) => (
                <Input
                  {...p}
                  name="email"
                  type="email"
                  autoComplete="off"
                  defaultValue={w("email")}
                  required
                />
              )}
            </Field>

            <Field id="rolle" label="Rolle" pflicht fehler={f("rolle")}>
              {(p) => (
                <Select {...p} name="rolle" defaultValue={w("rolle") || "PFLEGE"} required>
                  {ROLLEN.map((r) => (
                    <option key={r.wert} value={r.wert}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field
            id="passwort"
            label="Startpasswort"
            pflicht
            hilfe="Mindestens 10 Zeichen. Der Benutzer sollte es nach der ersten Anmeldung ändern."
            fehler={f("passwort")}
            className="max-w-md"
          >
            {(p) => (
              <Input {...p} name="passwort" type="password" autoComplete="new-password" required />
            )}
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" laedt={laeuft}>Benutzer anlegen</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={abbrechenNach}>Abbrechen</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
