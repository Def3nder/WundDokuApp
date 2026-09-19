"use client";

import { ChipGroup } from "./chip-group";
import { JaNein } from "./radio-chips";
import { Field, Textarea } from "@/components/ui/field";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import { ENTZUENDUNGSZEICHEN, LOKALE_INFEKTZEICHEN } from "@/lib/enums";

export function AbschnittInfektion({
  werte,
  fehler,
}: {
  werte: AufnahmeWerte;
  fehler: (feld: string) => string | undefined;
}) {
  return (
    <>
      <ChipGroup
        name="entzuendungszeichen"
        legende="Entzündungszeichen"
        optionen={ENTZUENDUNGSZEICHEN}
        vorgabe={werte.entzuendungszeichen}
        fehler={fehler("entzuendungszeichen")}
      />

      <ChipGroup
        name="lokaleInfektzeichen"
        legende="Lokale Infektzeichen"
        optionen={LOKALE_INFEKTZEICHEN}
        vorgabe={werte.lokaleInfektzeichen}
        fehler={fehler("lokaleInfektzeichen")}
      />

      <JaNein
        name="systemischeZeichen"
        legende="Systemische Infektionszeichen vorhanden?"
        vorgabe={werte.systemischeZeichen}
        fehler={fehler("systemischeZeichen")}
      />

      <Field
        id="infektionSonstiges"
        label="Weitere Beobachtungen zur Infektion"
        fehler={fehler("infektionSonstiges")}
      >
        {(p) => (
          <Textarea {...p} name="infektionSonstiges" rows={3} defaultValue={werte.infektionSonstiges} />
        )}
      </Field>

      <JaNein
        name="abstrichGenommen"
        legende="Abstrich genommen?"
        vorgabe={werte.abstrichGenommen}
        fehler={fehler("abstrichGenommen")}
      >
        <Field
          id="abstrichErgebnis"
          label="Abstrichergebnis"
          fehler={fehler("abstrichErgebnis")}
        >
          {(p) => (
            <Textarea {...p} name="abstrichErgebnis" rows={3} defaultValue={werte.abstrichErgebnis} />
          )}
        </Field>
      </JaNein>
    </>
  );
}
