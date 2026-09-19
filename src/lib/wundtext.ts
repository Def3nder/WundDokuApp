/**
 * Formuliert Wund-Angaben als lesbaren deutschen Text.
 *
 * Zentral, weil dieselben Formulierungen in Liste, Cockpit, Vergleichstabelle
 * und PDF-Export auftauchen - und dort identisch lauten muessen.
 */
import {
  AUSRICHTUNGEN,
  KOERPERREGIONEN,
  SEITEN,
  ZEITEINHEITEN,
  labelVon,
} from "@/lib/enums";

export type LokalisationFelder = {
  lokalisationRegion: string | null;
  lokalisationSeite: string | null;
  lokalisationAusrichtung: string | null;
  lokalisationFreitext: string | null;
};

/** z.B. "Unterschenkel links lateral" oder "Ferse rechts". */
export function beschreibeLokalisation(w: LokalisationFelder): string {
  const teile = [
    labelVon(KOERPERREGIONEN, w.lokalisationRegion),
    labelVon(SEITEN, w.lokalisationSeite).toLowerCase(),
    labelVon(AUSRICHTUNGEN, w.lokalisationAusrichtung).toLowerCase(),
  ].filter(Boolean);

  const strukturiert = teile.join(" ");

  // Der Freitext ergaenzt die Auswahl, ersetzt sie aber nicht.
  if (strukturiert && w.lokalisationFreitext) {
    return `${strukturiert} (${w.lokalisationFreitext})`;
  }
  return strukturiert || w.lokalisationFreitext || "";
}

export type DauerFelder = {
  bestehtSeitWert: number | null;
  bestehtSeitEinheit: string | null;
};

/** z.B. "8 Monaten". Leer, solange nicht beide Haelften da sind. */
export function beschreibeDauer(w: DauerFelder): string {
  if (w.bestehtSeitWert == null || !w.bestehtSeitEinheit) return "";

  const einheit = labelVon(ZEITEINHEITEN, w.bestehtSeitEinheit);
  // "1 Tagen" waere falsch - der Singular braucht eine eigene Form.
  if (w.bestehtSeitWert === 1) {
    const singular: Record<string, string> = {
      TAGE: "einem Tag",
      WOCHEN: "einer Woche",
      MONATE: "einem Monat",
      JAHRE: "einem Jahr",
    };
    return singular[w.bestehtSeitEinheit] ?? `1 ${einheit}`;
  }
  return `${w.bestehtSeitWert} ${einheit}`;
}

/** z.B. "2 Rezidive" - oder leer, wenn kein Rezidiv vorliegt. */
export function beschreibeRezidiv(w: {
  rezidiv: boolean;
  rezidivAnzahl: number | null;
}): string {
  if (!w.rezidiv) return "";
  if (w.rezidivAnzahl == null) return "Rezidiv";
  return w.rezidivAnzahl === 1 ? "1 Rezidiv" : `${w.rezidivAnzahl} Rezidive`;
}

/** Datum in deutscher Schreibweise, z.B. "18.09.2026". */
export function datum(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "vor 3 Tagen", "heute", "gestern" - fuer die Zeitleiste. */
export function relativesDatum(d: Date, jetzt = new Date()): string {
  const tage = Math.floor(
    (new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );

  if (tage === 0) return "heute";
  if (tage === 1) return "gestern";
  if (tage < 0) return datum(d);
  if (tage < 31) return `vor ${tage} Tagen`;
  if (tage < 365) {
    const monate = Math.round(tage / 30.4);
    return monate === 1 ? "vor einem Monat" : `vor ${monate} Monaten`;
  }
  const jahre = Math.round(tage / 365);
  return jahre === 1 ? "vor einem Jahr" : `vor ${jahre} Jahren`;
}
