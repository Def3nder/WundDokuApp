"use client";

import { ChipGroup } from "./chip-group";
import { RadioChips } from "./radio-chips";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import {
  FIXIERUNG,
  KOMPRESSION,
  KOMPRESSIONSKLASSEN,
  REINIGUNG,
  WUNDABDECKUNG,
  WUNDFUELLUNG,
  WUNDSPUELUNG,
} from "@/lib/enums";

export function AbschnittTherapie({
  werte,
  fehler,
}: {
  werte: AufnahmeWerte;
  fehler: (feld: string) => string | undefined;
}) {
  return (
    <>
      <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="wundspuelung"
          legende="Wundspülung"
          optionen={WUNDSPUELUNG}
          vorgabe={werte.wundspuelung}
          fehler={fehler("wundspuelung")}
        />
        <Field id="wundspuelungSonstiges" label="Andere Wundspülung" fehler={fehler("wundspuelungSonstiges")}>
          {(p) => <Input {...p} name="wundspuelungSonstiges" defaultValue={werte.wundspuelungSonstiges} />}
        </Field>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="reinigung"
          legende="Wundreinigung"
          optionen={REINIGUNG}
          vorgabe={werte.reinigung}
          fehler={fehler("reinigung")}
        />
        <Field id="reinigungSonstiges" label="Andere Reinigung" fehler={fehler("reinigungSonstiges")}>
          {(p) => <Input {...p} name="reinigungSonstiges" defaultValue={werte.reinigungSonstiges} />}
        </Field>
      </div>

          <div className="form-grid gap-5">
        <Field id="hautpflege" label="Hautpflege" fehler={fehler("hautpflege")}>
          {(p) => <Input {...p} name="hautpflege" defaultValue={werte.hautpflege} />}
        </Field>
        <Field id="wundrandschutz" label="Wundrandschutz" fehler={fehler("wundrandschutz")}>
          {(p) => <Input {...p} name="wundrandschutz" defaultValue={werte.wundrandschutz} />}
        </Field>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="wundfuellung"
          legende="Wundfüllung"
          optionen={WUNDFUELLUNG}
          vorgabe={werte.wundfuellung}
          fehler={fehler("wundfuellung")}
        />
          <div className="form-grid gap-5">
          <Field id="wundfuellungGroesseCm" label="Größe (cm)" fehler={fehler("wundfuellungGroesseCm")}>
            {(p) => <Input {...p} name="wundfuellungGroesseCm" inputMode="decimal" defaultValue={werte.wundfuellungGroesseCm} />}
          </Field>
          <Field id="wundfuellungSonstiges" label="Andere Wundfüllung" fehler={fehler("wundfuellungSonstiges")}>
            {(p) => <Input {...p} name="wundfuellungSonstiges" defaultValue={werte.wundfuellungSonstiges} />}
          </Field>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="wundabdeckung"
          legende="Wundabdeckung"
          optionen={WUNDABDECKUNG}
          vorgabe={werte.wundabdeckung}
          fehler={fehler("wundabdeckung")}
        />
          <div className="form-grid gap-5">
          <Field id="wundabdeckungGroesseCm" label="Größe (cm)" fehler={fehler("wundabdeckungGroesseCm")}>
            {(p) => <Input {...p} name="wundabdeckungGroesseCm" inputMode="decimal" defaultValue={werte.wundabdeckungGroesseCm} />}
          </Field>
          <Field id="wundabdeckungSonstiges" label="Andere Wundabdeckung" fehler={fehler("wundabdeckungSonstiges")}>
            {(p) => <Input {...p} name="wundabdeckungSonstiges" defaultValue={werte.wundabdeckungSonstiges} />}
          </Field>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="fixierung"
          legende="Fixierung"
          optionen={FIXIERUNG}
          vorgabe={werte.fixierung}
          fehler={fehler("fixierung")}
        />
        <Field id="fixierungSonstiges" label="Andere Fixierung" fehler={fehler("fixierungSonstiges")}>
          {(p) => <Input {...p} name="fixierungSonstiges" defaultValue={werte.fixierungSonstiges} />}
        </Field>
      </div>

      <div className="space-y-5 rounded-lg border border-border p-4 sm:p-5">
        <ChipGroup
          name="kompression"
          legende="Kompression"
          optionen={KOMPRESSION}
          vorgabe={werte.kompression}
          fehler={fehler("kompression")}
        />
        <div className="compact-grid gap-5">
          <Field id="kompressionBinde1BreiteCm" label="Binde 1: Breite (cm)" fehler={fehler("kompressionBinde1BreiteCm")}>
            {(p) => <Input {...p} name="kompressionBinde1BreiteCm" inputMode="decimal" defaultValue={werte.kompressionBinde1BreiteCm} />}
          </Field>
          <Field id="kompressionBinde1Anzahl" label="Binde 1: Anzahl" fehler={fehler("kompressionBinde1Anzahl")}>
            {(p) => <Input {...p} name="kompressionBinde1Anzahl" type="number" min={1} max={20} defaultValue={werte.kompressionBinde1Anzahl} />}
          </Field>
          <Field id="kompressionBinde2BreiteCm" label="Binde 2: Breite (cm)" fehler={fehler("kompressionBinde2BreiteCm")}>
            {(p) => <Input {...p} name="kompressionBinde2BreiteCm" inputMode="decimal" defaultValue={werte.kompressionBinde2BreiteCm} />}
          </Field>
          <Field id="kompressionBinde2Anzahl" label="Binde 2: Anzahl" fehler={fehler("kompressionBinde2Anzahl")}>
            {(p) => <Input {...p} name="kompressionBinde2Anzahl" type="number" min={1} max={20} defaultValue={werte.kompressionBinde2Anzahl} />}
          </Field>
        </div>
        <RadioChips
          name="kompressionKlasse"
          legende="Kompressionsklasse"
          optionen={KOMPRESSIONSKLASSEN}
          vorgabe={werte.kompressionKlasse}
          fehler={fehler("kompressionKlasse")}
        />
        <Field id="kompressionMass" label="Maß / Ausführung" fehler={fehler("kompressionMass")}>
          {(p) => <Input {...p} name="kompressionMass" defaultValue={werte.kompressionMass} />}
        </Field>
      </div>

      <Field id="therapieSonstiges" label="Weitere Therapieangaben" fehler={fehler("therapieSonstiges")}>
        {(p) => <Textarea {...p} name="therapieSonstiges" rows={3} defaultValue={werte.therapieSonstiges} />}
      </Field>

      <Field id="anmerkungen" label="Allgemeine Anmerkungen" fehler={fehler("anmerkungen")}>
        {(p) => <Textarea {...p} name="anmerkungen" rows={4} defaultValue={werte.anmerkungen} />}
      </Field>
    </>
  );
}
