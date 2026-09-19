"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { TrendBadge } from "@/components/wunde/trend-badge";
import {
  flaecheMm2,
  flaechenTrend,
  formatiereMm2,
} from "@/lib/wundmasse";

/** "12,5" -> 12.5 ; leer oder Unsinn -> null */
function zahl(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) || n <= 0 ? null : n;
}

/**
 * Breite, Laenge, Tiefe - mit sofort berechneter Flaeche.
 *
 * Die Flaeche ist die zentrale Heilungskennzahl. Sie waehrend der Eingabe zu
 * zeigen und direkt mit der Voraufnahme zu vergleichen, beantwortet die Frage,
 * die beim Verbandwechsel ohnehin gestellt wird: Wird es besser?
 */
export function Wundgroesse({
  vorgabe,
  vorherigeFlaeche,
  vorherigesDatum,
  fehler,
}: {
  vorgabe: { breiteMm: string; laengeMm: string; tiefeMm: string };
  vorherigeFlaeche: number | null;
  vorherigesDatum: string | null;
  fehler: (feld: string) => string | undefined;
}) {
  const [breite, setBreite] = useState(vorgabe.breiteMm);
  const [laenge, setLaenge] = useState(vorgabe.laengeMm);

  const flaeche = flaecheMm2({
    breiteMm: zahl(breite),
    laengeMm: zahl(laenge),
    tiefeMm: null,
  });
  const trend = flaechenTrend(flaeche, vorherigeFlaeche);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="breiteMm" label="Breite (mm)" fehler={fehler("breiteMm")}>
          {(p) => (
            <Input
              {...p}
              name="breiteMm"
              inputMode="decimal"
              value={breite}
              onChange={(e) => setBreite(e.target.value)}
            />
          )}
        </Field>

        <Field id="laengeMm" label="Länge (mm)" fehler={fehler("laengeMm")}>
          {(p) => (
            <Input
              {...p}
              name="laengeMm"
              inputMode="decimal"
              value={laenge}
              onChange={(e) => setLaenge(e.target.value)}
            />
          )}
        </Field>

        <Field id="tiefeMm" label="Tiefe (mm)" fehler={fehler("tiefeMm")}>
          {(p) => (
            <Input
              {...p}
              name="tiefeMm"
              inputMode="decimal"
              defaultValue={vorgabe.tiefeMm}
            />
          )}
        </Field>
      </div>

      {/* aria-live: der berechnete Wert aendert sich ohne Neuladen */}
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface-muted p-4"
      >
        <span className="text-sm text-muted-foreground">Fläche</span>
        <span className="tabular text-lg font-semibold">
          {formatiereMm2(flaeche)}
        </span>

        {trend && <TrendBadge trend={trend} />}

        {vorherigeFlaeche != null && (
          <span className="tabular text-sm text-muted-foreground">
            zuvor {formatiereMm2(vorherigeFlaeche)}
            {vorherigesDatum && ` am ${vorherigesDatum}`}
          </span>
        )}

        {flaeche == null && (
          <span className="text-sm text-muted-foreground">
            Breite und Länge angeben, um die Fläche zu berechnen
          </span>
        )}
      </div>
    </div>
  );
}
