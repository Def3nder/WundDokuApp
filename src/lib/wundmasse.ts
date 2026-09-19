/**
 * Berechnungen rund um die Wundgroesse.
 *
 * Bewusst ohne Datenbank- oder React-Bezug, damit sie sich direkt testen
 * lassen - hier still falsche Zahlen waeren klinisch relevant.
 */

export type Masse = {
  breiteMm: number | null;
  laengeMm: number | null;
  tiefeMm: number | null;
};

/**
 * Flaeche nach der ueblichen Naeherung Breite x Laenge.
 *
 * Das ist die Konvention der Wunddokumentation (kein Ellipsenmass), damit die
 * Werte mit denen auf dem Papierbogen vergleichbar bleiben.
 */
export function flaecheMm2(m: Masse): number | null {
  if (m.breiteMm == null || m.laengeMm == null) return null;
  if (m.breiteMm <= 0 || m.laengeMm <= 0) return null;
  return round(m.breiteMm * m.laengeMm, 1);
}

/** Volumennaeherung Breite x Laenge x Tiefe, nur wenn alle drei Masse da sind. */
export function volumenMm3(m: Masse): number | null {
  const flaeche = flaecheMm2(m);
  if (flaeche == null || m.tiefeMm == null || m.tiefeMm <= 0) return null;
  return round(flaeche * m.tiefeMm, 1);
}

export type Trend = {
  /** Differenz in mm^2, negativ = Wunde ist kleiner geworden */
  differenz: number;
  /** Veraenderung in Prozent, negativ = Verkleinerung */
  prozent: number;
  /** verkleinert = Heilung, vergroessert = Verschlechterung */
  richtung: "verkleinert" | "vergroessert" | "unveraendert";
};

/**
 * Vergleicht zwei Flaechen.
 *
 * Aenderungen unter 2 % gelten als unveraendert - Wundmessung am Bett ist
 * nicht genauer als das, und ein Pfeil bei 0,7 % waere irrefuehrend.
 */
export function flaechenTrend(
  aktuell: number | null,
  vorher: number | null,
  schwelleProzent = 2,
): Trend | null {
  if (aktuell == null || vorher == null || vorher <= 0) return null;

  const differenz = round(aktuell - vorher, 1);
  const prozent = round(((aktuell - vorher) / vorher) * 100, 1);

  const richtung =
    Math.abs(prozent) < schwelleProzent
      ? "unveraendert"
      : prozent < 0
        ? "verkleinert"
        : "vergroessert";

  return { differenz, prozent, richtung };
}

/** "−18,4 %" bzw. "+5,0 %" - deutsche Schreibweise mit echtem Minuszeichen. */
export function formatiereProzent(prozent: number): string {
  const vorzeichen = prozent < 0 ? "−" : prozent > 0 ? "+" : "±";
  const betrag = Math.abs(prozent).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${vorzeichen}${betrag} %`;
}

/** Messwerte mit Einheit, deutsche Dezimaltrennung. */
export function formatiereMm(wert: number | null | undefined): string {
  if (wert == null) return "–";
  return `${wert.toLocaleString("de-DE", { maximumFractionDigits: 1 })} mm`;
}

export function formatiereMm2(wert: number | null | undefined): string {
  if (wert == null) return "–";
  return `${wert.toLocaleString("de-DE", { maximumFractionDigits: 1 })} mm²`;
}

function round(wert: number, stellen: number): number {
  const faktor = 10 ** stellen;
  return Math.round(wert * faktor) / faktor;
}
