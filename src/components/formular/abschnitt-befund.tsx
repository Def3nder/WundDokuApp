"use client";

import { useState } from "react";
import { ChipGroup } from "./chip-group";
import { RadioChips } from "./radio-chips";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import {
  DEKUBITUS_KATEGORIEN,
  DIAGNOSEN_MIT_KATEGORIE,
  DIAGNOSEN_MIT_WAGNER,
  WAGNER_GRADE,
  WUNDGRUND,
  WUNDRAND,
  WUNDUMGEBUNG,
  WUNDUMGEBUNG_EXKLUSIV,
} from "@/lib/enums";

export function AbschnittBefund({
  werte,
  diagnoseTyp,
  fehler,
}: {
  werte: AufnahmeWerte;
  diagnoseTyp: string;
  fehler: (feld: string) => string | undefined;
}) {
  const [wundgrund, setWundgrund] = useState(werte.wundgrund);
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="datum" label="Aufnahmedatum" pflicht fehler={fehler("datum")}>
          {(p) => (
            <Input {...p} name="datum" type="date" max={heute} defaultValue={werte.datum} required />
          )}
        </Field>

        {DIAGNOSEN_MIT_WAGNER.includes(
          diagnoseTyp as (typeof DIAGNOSEN_MIT_WAGNER)[number],
        ) && (
          <Field
            id="wagnerArmstrongGrad"
            label="Wagner-/Armstrong-Grad"
            fehler={fehler("wagnerArmstrongGrad")}
          >
            {(p) => (
              <Select {...p} name="wagnerArmstrongGrad" defaultValue={werte.wagnerArmstrongGrad}>
                <option value="">Keine Angabe</option>
                {WAGNER_GRADE.map((o) => (
                  <option key={o.wert} value={o.wert}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {DIAGNOSEN_MIT_KATEGORIE.includes(
          diagnoseTyp as (typeof DIAGNOSEN_MIT_KATEGORIE)[number],
        ) && (
          <Field
            id="dekubitusKategorie"
            label="Dekubitus-Kategorie"
            fehler={fehler("dekubitusKategorie")}
          >
            {(p) => (
              <Select {...p} name="dekubitusKategorie" defaultValue={werte.dekubitusKategorie}>
                <option value="">Keine Angabe</option>
                {DEKUBITUS_KATEGORIEN.map((o) => (
                  <option key={o.wert} value={o.wert}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      <ChipGroup
        name="wundumgebung"
        legende="Wundumgebung"
        optionen={WUNDUMGEBUNG}
        vorgabe={werte.wundumgebung}
        exklusiv={WUNDUMGEBUNG_EXKLUSIV}
        fehler={fehler("wundumgebung")}
      />

      <ChipGroup
        name="wundrand"
        legende="Wundrand"
        optionen={WUNDRAND}
        vorgabe={werte.wundrand}
        fehler={fehler("wundrand")}
      />

      <ChipGroup
        name="wundgrund"
        legende="Wundgrund"
        optionen={WUNDGRUND}
        vorgabe={werte.wundgrund}
        spalten="zwei"
        fehler={fehler("wundgrund")}
        onChange={setWundgrund}
      />

      {wundgrund.includes("SONSTIGES") && (
        <Field
          id="wundgrundSonstigesText"
          label="Sonstiger Wundgrund"
          fehler={fehler("wundgrundSonstigesText")}
        >
          {(p) => (
            <Textarea
              {...p}
              name="wundgrundSonstigesText"
              rows={2}
              defaultValue={werte.wundgrundSonstigesText}
            />
          )}
        </Field>
      )}
    </>
  );
}
