"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { anmelden, type AnmeldeZustand } from "./actions";

const START: AnmeldeZustand = {};

export function LoginForm({ weiter }: { weiter?: string }) {
  const [zustand, formAction, laeuft] = useActionState(anmelden, START);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="weiter" value={weiter ?? ""} />

          {zustand.fehler && (
            // role=alert, damit Screenreader die Meldung ansagen.
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>{zustand.fehler}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" pflicht>
              E-Mail
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              defaultValue={zustand.email}
              className="tippziel w-full rounded-lg border border-border-strong bg-input px-3 py-2.5 text-base text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwort" pflicht>
              Passwort
            </Label>
            <input
              id="passwort"
              name="passwort"
              type="password"
              autoComplete="current-password"
              required
              className="tippziel w-full rounded-lg border border-border-strong bg-input px-3 py-2.5 text-base text-foreground"
            />
          </div>

          <Button type="submit" laedt={laeuft} className="w-full" size="lg">
            Anmelden
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
