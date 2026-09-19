"use client";

import { useState } from "react";
import { ChipGroup } from "./chip-group";
import { JaNein, RadioChips } from "./radio-chips";
import { Wundgroesse } from "./wundgroesse";
import { Field, Input } from "@/components/ui/field";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import { EXSUDAT_FARBEN, EXSUDAT_KONSISTENZ, EXSUDAT_MENGEN } from "@/lib/enums";

export function AbschnittGroesse({
  werte,
  vorherigeFlaeche,
  vorherigesDatum,
  fehler,
}: {
  werte: AufnahmeWerte;
  vorherigeFlaeche: number | null;
  vorherigesDatum: string | null;
  fehler: (feld: string) => string | undefined;
}) {
  const [farben, setFarben] = useState(werte.exsudatFarben);

  return (
    <>
      <Wundgroesse
        vorgabe={werte}
        vorherigeFlaeche={vorherigeFlaeche}
        vorherigesDatum={vorherigesDatum}
        fehler={fehler}
      />

      <RadioChips
        name="exsudatMenge"
        legende="Exsudatmenge"
        optionen={EXSUDAT_MENGEN}
        vorgabe={werte.exsudatMenge}
        fehler={fehler("exsudatMenge")}
      />

      <ChipGroup
        name="exsudatFarben"
        legende="Exsudatfarbe"
        optionen={EXSUDAT_FARBEN}
        vorgabe={werte.exsudatFarben}
        fehler={fehler("exsudatFarben")}
        onChange={setFarben}
      />

      {farben.includes("SONSTIGES") && (
        <Field
          id="exsudatFarbeSonstiges"
          label="Sonstige Exsudatfarbe"
          fehler={fehler("exsudatFarbeSonstiges")}
        >
          {(p) => (
            <Input {...p} name="exsudatFarbeSonstiges" defaultValue={werte.exsudatFarbeSonstiges} />
          )}
        </Field>
      )}

      <ChipGroup
        name="exsudatKonsistenz"
        legende="Exsudatkonsistenz"
        optionen={EXSUDAT_KONSISTENZ}
        vorgabe={werte.exsudatKonsistenz}
        fehler={fehler("exsudatKonsistenz")}
      />

      <JaNein name="geruch" legende="Geruch vorhanden?" vorgabe={werte.geruch} fehler={fehler("geruch")} />
    </>
  );
}
