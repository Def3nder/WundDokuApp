/** Kalender und Zeiterfassung verwenden auf jedem Geraet Europe/Berlin. */
export const ZEITZONE = "Europe/Berlin";
export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
export type ZeitVorgabe = {
  abDatum: string;
  standardBeginn: string;
  standardEnde: string;
  wochenMinuten: number;
  pauseMinuten: number;
  arbeitstage: number[];
};
export const STANDARD_VORGABE: ZeitVorgabe = {
  abDatum: "2000-01-01", standardBeginn: "08:00", standardEnde: "16:30", wochenMinuten: 2400, pauseMinuten: 30, arbeitstage: [1, 2, 3, 4, 5],
};
export type Arbeitszeit = { beginn: Date; ende: Date | null; pauseMinuten: number };

export function arbeitstageAus(json: string): number[] {
  try {
    const werte: unknown = JSON.parse(json);
    if (Array.isArray(werte) && werte.length > 0 && werte.every((t) => Number.isInteger(t) && t >= 1 && t <= 7)) {
      return [...new Set(werte as number[])].sort((a, b) => a - b);
    }
  } catch { /* Beschaedigte Vorgaben nicht zu Division durch null werden lassen. */ }
  return [...STANDARD_VORGABE.arbeitstage];
}

const lokalFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ZEITZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function lokaleZeit(zeit: Date): string {
  return lokalFormat.format(zeit).replace(" ", "T");
}

export function gueltigesDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert) || wert < "2000-01-01" || wert > "2099-12-31") return false;
  const datum = new Date(`${wert}T12:00:00Z`);
  return !Number.isNaN(datum.getTime()) && datum.toISOString().slice(0, 10) === wert;
}

/** Null Treffer bei der Zeitumstellung im Fruehjahr, zwei im Herbst. */
export function zeitKandidaten(wert: string): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wert)) return [];
  const scheinbarUtc = new Date(`${wert}:00Z`).getTime();
  if (!Number.isFinite(scheinbarUtc) || new Date(scheinbarUtc).toISOString().slice(0, 16) !== wert) return [];
  return [120, 60].map((offset) => new Date(scheinbarUtc - offset * 60_000))
    .filter((datum) => lokaleZeit(datum) === wert);
}

export function zeitAusEingabe(wert: string, vorkommen = "erstes"): Date | null {
  const kandidaten = zeitKandidaten(wert);
  return kandidaten[vorkommen === "zweites" ? kandidaten.length - 1 : 0] ?? null;
}

export function vorkommenVon(zeit: Date): "erstes" | "zweites" {
  const kandidaten = zeitKandidaten(lokaleZeit(zeit));
  return kandidaten.length === 2 && kandidaten[1].getTime() === zeit.getTime() ? "zweites" : "erstes";
}

export function datumPlus(datum: string, tage: number): string {
  const zeit = new Date(`${datum}T12:00:00Z`);
  zeit.setUTCDate(zeit.getUTCDate() + tage);
  return zeit.toISOString().slice(0, 10);
}

export function wochentag(datum: string): number {
  return new Date(`${datum}T12:00:00Z`).getUTCDay() || 7;
}

export function zeitraum(datum: string, ansicht: "woche" | "monat") {
  const von = ansicht === "woche" ? datumPlus(datum, 1 - wochentag(datum)) : `${datum.slice(0, 7)}-01`;
  const bis = ansicht === "woche" ? datumPlus(von, 7) : (() => {
    const d = new Date(`${von}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  })();
  return { von, bis };
}

export function vorgabeAm(vorgaben: ZeitVorgabe[], datum: string): ZeitVorgabe {
  return vorgaben.filter((v) => v.abDatum <= datum).sort((a, b) => b.abDatum.localeCompare(a.abDatum))[0] ?? STANDARD_VORGABE;
}

export function sollAm(vorgabe: ZeitVorgabe, datum: string): number {
  const tage = [...vorgabe.arbeitstage].sort((a, b) => a - b);
  const index = tage.indexOf(wochentag(datum));
  if (index < 0) return 0;
  // Ganze Minuten, auch wenn die Wochenzeit nicht glatt teilbar ist.
  return Math.floor(vorgabe.wochenMinuten / tage.length) + (index < vorgabe.wochenMinuten % tage.length ? 1 : 0);
}

export function bruttoMinuten(eintrag: Arbeitszeit): number {
  return eintrag.ende ? Math.round((eintrag.ende.getTime() - eintrag.beginn.getTime()) / 60_000) : 0;
}

export function nettoMinuten(eintrag: Arbeitszeit): number {
  return eintrag.ende ? Math.max(0, bruttoMinuten(eintrag) - eintrag.pauseMinuten) : 0;
}

/** Pausen anteilig verteilen; Differenzen kumulierter Rundungen erhalten die Summe. */
export function anteilImZeitraum(eintrag: Arbeitszeit, von: Date, bis: Date) {
  if (!eintrag.ende) return { brutto: 0, pause: 0, netto: 0 };
  const gesamt = bruttoMinuten(eintrag);
  if (gesamt <= 0) return { brutto: 0, pause: 0, netto: 0 };
  const links = Math.max(0, Math.min(gesamt, (von.getTime() - eintrag.beginn.getTime()) / 60_000));
  const rechts = Math.max(0, Math.min(gesamt, (bis.getTime() - eintrag.beginn.getTime()) / 60_000));
  const brutto = rechts - links;
  const pause = Math.round(rechts / gesamt * eintrag.pauseMinuten) - Math.round(links / gesamt * eintrag.pauseMinuten);
  return { brutto, pause, netto: brutto - pause };
}

export function auswertung(eintraege: Arbeitszeit[], vorgaben: ZeitVorgabe[], von: string, bis: string, heute: string) {
  const tage = [];
  for (let datum = von; datum < bis; datum = datumPlus(datum, 1)) {
    const start = zeitAusEingabe(`${datum}T00:00`)!;
    const ende = zeitAusEingabe(`${datumPlus(datum, 1)}T00:00`)!;
    const summen = eintraege.reduce((summe, e) => {
      const anteil = anteilImZeitraum(e, start, ende);
      return { brutto: summe.brutto + anteil.brutto, pause: summe.pause + anteil.pause, netto: summe.netto + anteil.netto };
    }, { brutto: 0, pause: 0, netto: 0 });
    tage.push({ datum, ...summen, soll: sollAm(vorgabeAm(vorgaben, datum), datum) });
  }
  return {
    tage,
    netto: tage.reduce((summe, t) => summe + t.netto, 0),
    pause: tage.reduce((summe, t) => summe + t.pause, 0),
    soll: tage.reduce((summe, t) => summe + t.soll, 0),
    sollBisHeute: tage.filter((t) => t.datum <= heute).reduce((summe, t) => summe + t.soll, 0),
  };
}

export function minutenText(minuten: number, mitVorzeichen = false): string {
  const m = Math.abs(Math.round(minuten));
  return `${minuten < 0 ? "−" : mitVorzeichen && minuten > 0 ? "+" : ""}${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}

export function datumText(datum: string, kurz = false): string {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", {
    timeZone: "UTC", day: "2-digit", month: "2-digit", ...(kurz ? {} : { year: "numeric" }),
  });
}

export function zeitText(zeit: Date): string {
  return zeit.toLocaleString("de-DE", {
    timeZone: ZEITZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
