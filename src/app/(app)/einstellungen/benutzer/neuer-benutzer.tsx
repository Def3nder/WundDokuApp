"use client";

import { useActionState } from "react";
import { CircleCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import { benutzerAnlegen } from "@/actions/benutzer";
import { ROLLEN } from "@/lib/enums";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

export function NeuerBenutzer() {
  const [zustand, formAction, laeuft] = useActionState(benutzerAnlegen, START);

  const w = (feld: string) => zustand.werte?.[feld] ?? "";
  const f = (feld: string) => zustand.fehler?.[feld];

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <UserPlus className="size-5 text-primary" aria-hidden="true" />
          Benutzer anlegen
        </h2>

        <form action={formAction} className="space-y-5" noValidate>
          <FehlerUebersicht fehler={zustand.fehler} />

          {zustand.meldung && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-accent"
            >
              <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
              {zustand.meldung}
            </p>
          )}

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

          <Button type="submit" laedt={laeuft}>
            Benutzer anlegen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
