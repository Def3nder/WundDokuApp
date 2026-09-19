import { WUNDGRUND, WUNDGRUND_GRUPPEN, labelsVon } from "@/lib/enums";

export type WundgrundGruppeId = (typeof WUNDGRUND_GRUPPEN)[number]["id"];

export type WundgrundAenderung = {
  hinzugekommen: string[];
  entfallen: string[];
};

/** Zaehlt die dokumentierten Einzelbefunde je klinischer Diagrammgruppe. */
export function gruppiereWundgrund(
  werte: readonly string[],
): Record<WundgrundGruppeId, number> {
  return Object.fromEntries(
    WUNDGRUND_GRUPPEN.map((gruppe) => [
      gruppe.id,
      gruppe.werte.filter((wert) => werte.includes(wert)).length,
    ]),
  ) as Record<WundgrundGruppeId, number>;
}

/** Liefert eine gerichtete Aenderung: von der Ausgangs- zur Vergleichsaufnahme. */
export function wundgrundAenderung(
  ausgang: readonly string[],
  vergleich: readonly string[],
): WundgrundAenderung {
  const hinzugekommen = vergleich.filter((wert) => !ausgang.includes(wert));
  const entfallen = ausgang.filter((wert) => !vergleich.includes(wert));
  return {
    hinzugekommen: labelsVon(WUNDGRUND, hinzugekommen),
    entfallen: labelsVon(WUNDGRUND, entfallen),
  };
}

export function zahlenDifferenz(
  ausgang: number | null | undefined,
  vergleich: number | null | undefined,
): number | null {
  if (ausgang == null || vergleich == null) return null;
  return Math.round((vergleich - ausgang) * 10) / 10;
}
