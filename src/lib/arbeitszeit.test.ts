import { describe, expect, it } from "vitest";
import { anteilImZeitraum, arbeitstageAus, auswertung, datumPlus, gueltigesDatum, lokaleZeit, minutenText, sollAm, STANDARD_VORGABE, vorgabeAm, vorkommenVon, zeitAusEingabe, zeitKandidaten, zeitraum } from "./arbeitszeit";
import { zeitBuchungSchema, zeitVorgabeSchema } from "./schema/arbeitszeit";

const zeit = (v: string) => zeitAusEingabe(v)!;
const buchung = { beginn: "2026-10-01T08:00", ende: "2026-10-01T16:30", pauseMinuten: 30, notiz: "" };
const vorgabe = { abDatum: "2026-10-01", standardBeginn: "08:00", standardEnde: "16:30", wochenStunden: 40, pauseMinuten: 30, arbeitstage: [1, 2, 3, 4, 5] };

describe("Berliner Kalender", () => {
  it("ist unabhaengig von der lokalen Server-Zeitzone", () => {
    expect(zeit("2026-07-01T08:00").toISOString()).toBe("2026-07-01T06:00:00.000Z");
    expect(zeit("2026-12-01T08:00").toISOString()).toBe("2026-12-01T07:00:00.000Z");
    expect(lokaleZeit(new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-02T00:30");
  });
  it("verwirft ungueltige Daten und die uebersprungene Stunde", () => {
    for (const wert of ["2026-02-30T08:00", "2026-10-01T24:00", "2026-03-29T02:30", "ungültig"]) expect(zeitKandidaten(wert)).toEqual([]);
    expect(gueltigesDatum("2026-02-29")).toBe(false);
    expect(gueltigesDatum("2028-02-29")).toBe(true);
  });
  it("unterscheidet die zwei Herbststunden und erhaelt die Auswahl beim Bearbeiten", () => {
    expect(zeitKandidaten("2026-10-25T02:30").map((d) => d.toISOString())).toEqual(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]);
    expect(vorkommenVon(zeitAusEingabe("2026-10-25T02:30", "zweites")!)).toBe("zweites");
  });
  it("berechnet Wochen ab Montag und Monatswechsel inklusive Schaltjahr", () => {
    expect(zeitraum("2027-01-01", "woche")).toEqual({ von: "2026-12-28", bis: "2027-01-04" });
    expect(zeitraum("2028-02-15", "monat")).toEqual({ von: "2028-02-01", bis: "2028-03-01" });
    expect(datumPlus("2028-02-28", 1)).toBe("2028-02-29");
    expect(zeit("1999-12-27T00:00")).not.toBeNull();
  });
});

describe("Zeitvalidierung", () => {
  it("akzeptiert Tagesbuchungen, Nachtschichten und laufende Zeiten", () => {
    expect(zeitBuchungSchema.safeParse(buchung).success).toBe(true);
    expect(zeitBuchungSchema.safeParse({ ...buchung, beginn: "2026-10-01T22:00", ende: "2026-10-02T06:30" }).success).toBe(true);
    expect(zeitBuchungSchema.safeParse({ ...buchung, ende: "" }).success).toBe(true);
  });
  it.each([
    { ende: "2026-10-01T07:59" }, { ende: "2026-10-01T08:00" }, { ende: "2026-10-02T08:01" },
    { pauseMinuten: -1 }, { pauseMinuten: 510 }, { pauseMinuten: "abc" }, { notiz: "x".repeat(501) }, { beginn: "1900-01-01T08:00" },
  ])("verwirft unplausible Buchung %j", (patch) => expect(zeitBuchungSchema.safeParse({ ...buchung, ...patch }).success).toBe(false));
  it("validiert Vorgaben, auch Nachtvorlagen und Nullstunden", () => {
    expect(zeitVorgabeSchema.parse(vorgabe).wochenMinuten).toBe(2400);
    expect(zeitVorgabeSchema.safeParse({ ...vorgabe, standardBeginn: "22:00", standardEnde: "06:00", wochenStunden: 0 }).success).toBe(true);
    for (const patch of [{ arbeitstage: [] }, { arbeitstage: [1, 1] }, { wochenStunden: -1 }, { standardBeginn: "24:00" }, { standardEnde: "08:00" }, { pauseMinuten: 600 }]) {
      expect(zeitVorgabeSchema.safeParse({ ...vorgabe, ...patch }).success).toBe(false);
    }
  });
});

describe("Auswertungen", () => {
  it("berechnet Netto, Pause, Monatssoll und Saldo nur bis heute", () => {
    const e = zeitBuchungSchema.parse(buchung);
    const bericht = auswertung([e], [], "2026-10-01", "2026-11-01", "2026-10-01");
    expect(bericht.netto).toBe(480);
    expect(bericht.pause).toBe(30);
    expect(bericht.soll).toBe(22 * 480);
    expect(bericht.sollBisHeute).toBe(480);
  });
  it("verteilt Nachtarbeit ueber Monatsgrenzen ohne doppelte Pause", () => {
    const e = { beginn: zeit("2026-09-30T22:00"), ende: zeit("2026-10-01T06:00"), pauseMinuten: 31 };
    const a = anteilImZeitraum(e, zeit("2026-09-01T00:00"), zeit("2026-10-01T00:00"));
    const b = anteilImZeitraum(e, zeit("2026-10-01T00:00"), zeit("2026-11-01T00:00"));
    expect(a.brutto).toBe(120);
    expect(a.pause + b.pause).toBe(31);
    expect(a.netto + b.netto).toBe(449);
  });
  it("zaehlt tatsaechliche Dauer bei Sommer- und Winterzeitwechsel", () => {
    const sommer = { beginn: zeit("2026-03-29T01:00"), ende: zeit("2026-03-29T04:00"), pauseMinuten: 0 };
    const winter = { beginn: zeit("2026-10-25T01:00"), ende: zeit("2026-10-25T04:00"), pauseMinuten: 0 };
    expect(auswertung([sommer], [], "2026-03-29", "2026-03-30", "2026-12-01").netto).toBe(120);
    expect(auswertung([winter], [], "2026-10-25", "2026-10-26", "2026-12-01").netto).toBe(240);
  });
  it("zaehlt laufende Zeiten nicht als abgeschlossene Arbeit", () => {
    expect(auswertung([{ beginn: zeit("2026-10-01T08:00"), ende: null, pauseMinuten: 30 }], [], "2026-10-01", "2026-10-02", "2026-10-01").netto).toBe(0);
  });
  it("wendet geaenderte Sollzeiten nur ab dem Gültigkeitsdatum an", () => {
    const vorgaben = [{ ...STANDARD_VORGABE, abDatum: "2026-10-15", wochenMinuten: 1800 }];
    expect(vorgabeAm(vorgaben, "2026-10-14").wochenMinuten).toBe(2400);
    expect(vorgabeAm(vorgaben, "2026-10-15").wochenMinuten).toBe(1800);
    expect(auswertung([], vorgaben, "2026-10-12", "2026-10-19", "2026-10-19").soll).toBe(3 * 480 + 2 * 360);
  });
  it("verteilt ungerade Wochenminuten verlustfrei, ignoriert freie Tage", () => {
    const v = { ...STANDARD_VORGABE, wochenMinuten: 1000, arbeitstage: [1, 3, 5] };
    const werte = Array.from({ length: 7 }, (_, i) => sollAm(v, datumPlus("2026-10-05", i)));
    expect(werte).toEqual([334, 0, 333, 0, 333, 0, 0]);
    expect(arbeitstageAus("[5,1,1]")).toEqual([1, 5]);
    expect(arbeitstageAus("[]")).toEqual([1, 2, 3, 4, 5]);
  });
  it("formatiert Stunden auch jenseits eines Tages und negative Salden", () => {
    expect(minutenText(2400)).toBe("40:00 h");
    expect(minutenText(-75, true)).toBe("−1:15 h");
    expect(minutenText(30, true)).toBe("+0:30 h");
  });
});
