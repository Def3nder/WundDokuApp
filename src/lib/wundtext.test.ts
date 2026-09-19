import { describe, expect, it } from "vitest";
import {
  beschreibeDauer,
  beschreibeLokalisation,
  beschreibeRezidiv,
  relativesDatum,
} from "./wundtext";

const ohneLokalisation = {
  lokalisationRegion: null,
  lokalisationSeite: null,
  lokalisationAusrichtung: null,
  lokalisationFreitext: null,
};

describe("beschreibeLokalisation", () => {
  it("setzt Region, Seite und Ausrichtung zusammen", () => {
    expect(
      beschreibeLokalisation({
        ...ohneLokalisation,
        lokalisationRegion: "UNTERSCHENKEL",
        lokalisationSeite: "LINKS",
        lokalisationAusrichtung: "LATERAL",
      }),
    ).toBe("Unterschenkel links lateral");
  });

  it("laesst weg, was nicht angegeben ist", () => {
    expect(
      beschreibeLokalisation({
        ...ohneLokalisation,
        lokalisationRegion: "FERSE",
        lokalisationSeite: "RECHTS",
      }),
    ).toBe("Ferse rechts");
  });

  it("haengt den Freitext als Zusatz an, statt ihn zu ersetzen", () => {
    expect(
      beschreibeLokalisation({
        ...ohneLokalisation,
        lokalisationRegion: "UNTERSCHENKEL",
        lokalisationSeite: "LINKS",
        lokalisationFreitext: "handbreit über dem Innenknöchel",
      }),
    ).toBe("Unterschenkel links (handbreit über dem Innenknöchel)");
  });

  it("nutzt den Freitext allein, wenn nichts ausgewaehlt ist", () => {
    expect(
      beschreibeLokalisation({ ...ohneLokalisation, lokalisationFreitext: "Steißbein" }),
    ).toBe("Steißbein");
  });

  it("liefert leeren Text ohne jede Angabe", () => {
    expect(beschreibeLokalisation(ohneLokalisation)).toBe("");
  });
});

describe("beschreibeDauer", () => {
  it("verwendet den Plural", () => {
    expect(beschreibeDauer({ bestehtSeitWert: 8, bestehtSeitEinheit: "MONATE" })).toBe(
      "8 Monaten",
    );
  });

  it("verwendet eine eigene Singularform", () => {
    // "1 Tagen" waere falsch.
    expect(beschreibeDauer({ bestehtSeitWert: 1, bestehtSeitEinheit: "TAGE" })).toBe("einem Tag");
    expect(beschreibeDauer({ bestehtSeitWert: 1, bestehtSeitEinheit: "WOCHEN" })).toBe(
      "einer Woche",
    );
    expect(beschreibeDauer({ bestehtSeitWert: 1, bestehtSeitEinheit: "JAHRE" })).toBe(
      "einem Jahr",
    );
  });

  it("braucht beide Haelften", () => {
    expect(beschreibeDauer({ bestehtSeitWert: 8, bestehtSeitEinheit: null })).toBe("");
    expect(beschreibeDauer({ bestehtSeitWert: null, bestehtSeitEinheit: "MONATE" })).toBe("");
  });
});

describe("beschreibeRezidiv", () => {
  it("unterscheidet Singular und Plural", () => {
    expect(beschreibeRezidiv({ rezidiv: true, rezidivAnzahl: 1 })).toBe("1 Rezidiv");
    expect(beschreibeRezidiv({ rezidiv: true, rezidivAnzahl: 2 })).toBe("2 Rezidive");
  });

  it("kommt ohne Anzahl aus", () => {
    expect(beschreibeRezidiv({ rezidiv: true, rezidivAnzahl: null })).toBe("Rezidiv");
  });

  it("schweigt ohne Rezidiv", () => {
    expect(beschreibeRezidiv({ rezidiv: false, rezidivAnzahl: null })).toBe("");
  });
});

describe("relativesDatum", () => {
  const jetzt = new Date("2026-09-18T10:00:00");

  it("benennt heute und gestern", () => {
    expect(relativesDatum(new Date("2026-09-18T07:00:00"), jetzt)).toBe("heute");
    expect(relativesDatum(new Date("2026-09-17T23:00:00"), jetzt)).toBe("gestern");
  });

  it("zaehlt Tage, dann Monate, dann Jahre", () => {
    expect(relativesDatum(new Date("2026-09-15"), jetzt)).toBe("vor 3 Tagen");
    expect(relativesDatum(new Date("2026-07-18"), jetzt)).toBe("vor 2 Monaten");
    expect(relativesDatum(new Date("2024-09-18"), jetzt)).toBe("vor 2 Jahren");
  });

  it("vergleicht Kalendertage, nicht Uhrzeiten", () => {
    // 23:00 gestern zu 10:00 heute sind keine 24 Stunden, aber ein Tag.
    expect(relativesDatum(new Date("2026-09-17T23:59:00"), jetzt)).toBe("gestern");
  });

  it("zeigt zukuenftige Daten als Datum", () => {
    expect(relativesDatum(new Date("2026-09-20"), jetzt)).toBe("20.09.2026");
  });
});
