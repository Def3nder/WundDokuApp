import { describe, expect, it } from "vitest";
import {
  flaecheMm2,
  flaechenTrend,
  formatiereMm2,
  formatiereProzent,
  volumenMm3,
} from "./wundmasse";

describe("flaecheMm2", () => {
  it("rechnet Breite x Laenge", () => {
    expect(flaecheMm2({ breiteMm: 30, laengeMm: 40, tiefeMm: 4 })).toBe(1200);
  });

  it("liefert null, solange ein Mass fehlt", () => {
    expect(flaecheMm2({ breiteMm: 30, laengeMm: null, tiefeMm: 4 })).toBeNull();
    expect(flaecheMm2({ breiteMm: null, laengeMm: null, tiefeMm: null })).toBeNull();
  });

  it("wertet 0 und negative Eingaben als fehlend", () => {
    // Eine Wunde mit Breite 0 gibt es nicht - das ist ein Eingabefehler und
    // darf keine Flaeche von 0 mm^2 in den Verlauf schreiben.
    expect(flaecheMm2({ breiteMm: 0, laengeMm: 40, tiefeMm: null })).toBeNull();
    expect(flaecheMm2({ breiteMm: -5, laengeMm: 40, tiefeMm: null })).toBeNull();
  });

  it("rundet auf eine Nachkommastelle", () => {
    expect(flaecheMm2({ breiteMm: 12.35, laengeMm: 7.7, tiefeMm: null })).toBe(95.1);
  });
});

describe("volumenMm3", () => {
  it("rechnet Flaeche x Tiefe", () => {
    expect(volumenMm3({ breiteMm: 10, laengeMm: 20, tiefeMm: 3 })).toBe(600);
  });

  it("braucht alle drei Masse", () => {
    expect(volumenMm3({ breiteMm: 10, laengeMm: 20, tiefeMm: null })).toBeNull();
  });
});

describe("flaechenTrend", () => {
  it("erkennt eine Verkleinerung", () => {
    const t = flaechenTrend(476, 1200);
    expect(t).toEqual({ differenz: -724, prozent: -60.3, richtung: "verkleinert" });
  });

  it("erkennt eine Vergroesserung", () => {
    expect(flaechenTrend(1320, 1200)?.richtung).toBe("vergroessert");
  });

  it("wertet kleine Abweichungen als unveraendert", () => {
    // Wundmessung am Bett ist nicht genauer als ein paar Prozent.
    expect(flaechenTrend(1210, 1200)?.richtung).toBe("unveraendert");
    expect(flaechenTrend(1188, 1200)?.richtung).toBe("unveraendert");
  });

  it("nimmt die Schwelle als Parameter", () => {
    expect(flaechenTrend(1210, 1200, 0.5)?.richtung).toBe("vergroessert");
  });

  it("liefert null ohne Vergleichswert", () => {
    expect(flaechenTrend(476, null)).toBeNull();
    expect(flaechenTrend(null, 1200)).toBeNull();
    expect(flaechenTrend(476, 0)).toBeNull();
  });
});

describe("Formatierung", () => {
  it("nutzt ein echtes Minuszeichen und deutsche Dezimaltrennung", () => {
    expect(formatiereProzent(-60.3)).toBe("−60,3 %");
    expect(formatiereProzent(5)).toBe("+5,0 %");
    expect(formatiereProzent(0)).toBe("±0,0 %");
  });

  it("zeigt fehlende Masse als Gedankenstrich", () => {
    expect(formatiereMm2(null)).toBe("–");
    expect(formatiereMm2(1200)).toBe("1.200 mm²");
  });
});
