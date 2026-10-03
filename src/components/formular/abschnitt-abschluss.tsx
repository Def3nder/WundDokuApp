"use client";

import { CircleCheck } from "lucide-react";
import { JaNein } from "./radio-chips";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";

export function AbschnittAbschluss({
  werte,
  fehler,
}: {
  werte: AufnahmeWerte;
  fehler: (feld: string) => string | undefined;
}) {
  return (
    <>
      <JaNein
        name="wundeGeheilt"
        legende="Wunde ist abgeheilt?"
        vorgabe={werte.wundeGeheilt}
        fehler={fehler("wundeGeheilt")}
      >
        <p className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm text-foreground">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          Beim Speichern wird die Wunde als abgeschlossen markiert, mit dem Datum
          dieser Aufnahme. Sie erscheint dann nicht mehr unter den offenen Wunden.
          Eine weitere Folgeaufnahme eröffnet sie wieder.
        </p>
      </JaNein>
    </>
  );
}
