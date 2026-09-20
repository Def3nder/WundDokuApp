import { EXSUDAT_MENGEN, EXSUDAT_STUFE, WUNDGRUND, WUNDGRUND_GRUPPEN, labelVon, labelsVon } from "@/lib/enums";
import { flaecheMm2 } from "@/lib/wundmasse";
import { leseAuswahl } from "@/lib/utils";

export type WundgrundGruppeId = (typeof WUNDGRUND_GRUPPEN)[number]["id"];

export type Verlaufspunkt = {
  id: string;
  datum: string;
  flaeche: number | null;
  breiteMm: number | null;
  laengeMm: number | null;
  tiefeMm: number | null;
  schmerzVas: number | null;
  exsudatStufe: number | null;
  exsudatLabel: string;
  wundgrund: Record<WundgrundGruppeId, number>;
};

/** Minimale Aufnahmefelder, die ein Verlaufsdiagramm-Datenpunkt braucht. */
export type AufnahmeFuerVerlauf = {
  id: string;
  datum: Date;
  breiteMm: number | null;
  laengeMm: number | null;
  tiefeMm: number | null;
  schmerzen: boolean;
  schmerzVas: number | null;
  exsudatMenge: string | null;
  wundgrund: string;
};

export type WundgrundAenderung = {
  hinzugekommen: string[];
  entfallen: string[];
};

type DiagrammTooltipEintrag = {
  payload?: {
    datum?: unknown;
  };
};

const datumKurzFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});
const datumLangFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function diagrammDatum(wert: unknown): Date | null {
  if (typeof wert !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(wert)) return null;
  const datum = new Date(wert);
  return Number.isNaN(datum.getTime()) ? null : datum;
}

export function diagrammDatumKurz(wert: unknown): string {
  const datum = diagrammDatum(wert);
  return datum ? datumKurzFormatter.format(datum) : "–";
}

export function diagrammDatumLang(wert: unknown): string {
  const datum = diagrammDatum(wert);
  return datum ? datumLangFormatter.format(datum) : "Datum unbekannt";
}

/**
 * Formatiert einen echten Zeitstempel (Millisekunden) fuer Achsenbeschriftungen
 * einer zeitproportionalen X-Achse (aktuell nur die kleine Wundflaechen-
 * Vorschau bei "Aktuelle Flaeche"). Anders als `diagrammDatumKurz` erwartet
 * diese Funktion ausschliesslich Werte, die wir selbst aus `Verlaufspunkt.datum`
 * berechnet haben - keine von Recharts intern gelieferten Werte unklarer
 * Herkunft (siehe `diagrammTooltipDatum`).
 */
export function diagrammAchsenDatum(zeitstempel: number): string {
  return datumKurzFormatter.format(new Date(zeitstempel));
}

/**
 * Recharts kann als Tooltip-Label den numerischen Datenindex liefern. Das
 * echte Aufnahmedatum steht verlaesslich im Payload des aktiven Datenpunkts.
 */
export function diagrammTooltipDatum(
  label: unknown,
  eintraege: readonly DiagrammTooltipEintrag[],
): string {
  const payloadDatum = eintraege.find((eintrag) => diagrammDatum(eintrag.payload?.datum))?.payload
    ?.datum;
  return diagrammDatumLang(payloadDatum ?? label);
}

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

/**
 * Baut die Datenpunkte fuer die Verlaufsdiagramme - dieselbe Aufbereitung
 * fuer Bildschirm (`Verlaufsdiagramme`) und PDF-Export, damit beide niemals
 * auseinanderlaufen. Erwartet chronologisch aufsteigend sortierte Aufnahmen.
 */
export function baueVerlaufspunkte(
  aufnahmen: readonly AufnahmeFuerVerlauf[],
): Verlaufspunkt[] {
  return aufnahmen.map((aufnahme) => ({
    id: aufnahme.id,
    datum: aufnahme.datum.toISOString(),
    flaeche: flaecheMm2(aufnahme),
    breiteMm: aufnahme.breiteMm,
    laengeMm: aufnahme.laengeMm,
    tiefeMm: aufnahme.tiefeMm,
    schmerzVas: aufnahme.schmerzen ? (aufnahme.schmerzVas ?? null) : 0,
    exsudatStufe: aufnahme.exsudatMenge ? (EXSUDAT_STUFE[aufnahme.exsudatMenge] ?? null) : null,
    exsudatLabel: labelVon(EXSUDAT_MENGEN, aufnahme.exsudatMenge),
    wundgrund: gruppiereWundgrund(leseAuswahl(aufnahme.wundgrund)),
  }));
}
