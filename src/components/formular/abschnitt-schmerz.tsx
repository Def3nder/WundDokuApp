"use client";

import { useState } from "react";
import { JaNein, RadioChips } from "./radio-chips";
import { VasSlider } from "./vas-slider";
import { Zifferblatt } from "./zifferblatt";
import { Field, Textarea } from "@/components/ui/field";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import { SCHMERZ_ORT_MODI } from "@/lib/enums";

function SchmerzOrt({
  label,
  modusName,
  uhrName,
  modusVorgabe,
  uhrVorgabe,
  fehler,
}: {
  label: string;
  modusName: string;
  uhrName: string;
  modusVorgabe: string;
  uhrVorgabe: number | null;
  fehler: (feld: string) => string | undefined;
}) {
  const [modus, setModus] = useState<string | null>(modusVorgabe || null);

  return (
    <div className="rounded-lg border border-border p-4">
      <RadioChips
        name={modusName}
        legende={label}
        optionen={SCHMERZ_ORT_MODI}
        vorgabe={modusVorgabe}
        fehler={fehler(modusName)}
        onChange={setModus}
      />
      {modus === "UHR" && (
        <div className="mt-4">
          <Zifferblatt name={uhrName} vorgabe={uhrVorgabe} fehler={fehler(uhrName)} />
        </div>
      )}
    </div>
  );
}

export function AbschnittSchmerz({
  werte,
  fehler,
}: {
  werte: AufnahmeWerte;
  fehler: (feld: string) => string | undefined;
}) {
  return (
    <>
      <JaNein
        name="schmerzen"
        legende="Schmerzen vorhanden?"
        vorgabe={werte.schmerzen}
        fehler={fehler("schmerzen")}
      >
        <div className="space-y-6 rounded-lg bg-surface-muted p-4 sm:p-5">
          <VasSlider
            name="schmerzVas"
            label="Aktuelle Schmerzstärke (VAS/NRS)"
            vorgabe={werte.schmerzVas}
            fehler={fehler("schmerzVas")}
          />

          <div className="form-grid gap-4">
            <SchmerzOrt
              label="In der Wunde"
              modusName="schmerzWundeModus"
              uhrName="schmerzWundeUhr"
              modusVorgabe={werte.schmerzWundeModus}
              uhrVorgabe={werte.schmerzWundeUhr}
              fehler={fehler}
            />
            <SchmerzOrt
              label="Am Wundrand"
              modusName="schmerzWundrandModus"
              uhrName="schmerzWundrandUhr"
              modusVorgabe={werte.schmerzWundrandModus}
              uhrVorgabe={werte.schmerzWundrandUhr}
              fehler={fehler}
            />
            <SchmerzOrt
              label="Wundumgebung"
              modusName="schmerzWundumgebungModus"
              uhrName="schmerzWundumgebungUhr"
              modusVorgabe={werte.schmerzWundumgebungModus}
              uhrVorgabe={werte.schmerzWundumgebungUhr}
              fehler={fehler}
            />
          </div>

          <div className="form-grid gap-5">
            <JaNein
              name="schmerzVerbandwechsel"
              legende="Beim Verbandwechsel?"
              vorgabe={werte.schmerzVerbandwechsel}
              fehler={fehler("schmerzVerbandwechsel")}
            >
              <VasSlider
                name="schmerzVerbandwechselVas"
                label="VAS/NRS"
                vorgabe={werte.schmerzVerbandwechselVas}
                fehler={fehler("schmerzVerbandwechselVas")}
              />
            </JaNein>

            <JaNein
              name="schmerzDruck"
              legende="Bei Druck?"
              vorgabe={werte.schmerzDruck}
              fehler={fehler("schmerzDruck")}
            >
              <VasSlider
                name="schmerzDruckVas"
                label="VAS/NRS"
                vorgabe={werte.schmerzDruckVas}
                fehler={fehler("schmerzDruckVas")}
              />
            </JaNein>

            <JaNein
              name="schmerzUeberall"
              legende="Überall im Wundbereich?"
              vorgabe={werte.schmerzUeberall}
              fehler={fehler("schmerzUeberall")}
            >
              <VasSlider
                name="schmerzUeberallVas"
                label="VAS/NRS"
                vorgabe={werte.schmerzUeberallVas}
                fehler={fehler("schmerzUeberallVas")}
              />
            </JaNein>
          </div>

          <JaNein
            name="schmerztagebuch"
            legende="Schmerztagebuch geführt?"
            vorgabe={werte.schmerztagebuch}
            fehler={fehler("schmerztagebuch")}
          />

          <Field
            id="schmerzSonstiges"
            label="Weitere Angaben zu Schmerzen"
            fehler={fehler("schmerzSonstiges")}
          >
            {(p) => (
              <Textarea {...p} name="schmerzSonstiges" rows={3} defaultValue={werte.schmerzSonstiges} />
            )}
          </Field>
        </div>
      </JaNein>

      <Field
        id="wundheilungsfaktoren"
        label="Einflussfaktoren auf die Wundheilung"
        hilfe="Zum Beispiel Mobilität, Ernährung, Begleiterkrankungen oder Therapieadhärenz"
        fehler={fehler("wundheilungsfaktoren")}
      >
        {(p) => (
          <Textarea
            {...p}
            name="wundheilungsfaktoren"
            rows={4}
            defaultValue={werte.wundheilungsfaktoren}
          />
        )}
      </Field>
    </>
  );
}
