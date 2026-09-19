import { describe, expect, it } from "vitest";
import { gruppiereWundgrund, wundgrundAenderung, zahlenDifferenz } from "./auswertung";

describe("gruppiereWundgrund", () => {
  it("ordnet Einzelbefunde den fuenf klinischen Gruppen zu", () => {
    expect(
      gruppiereWundgrund([
        "EPITHELGEWEBE",
        "GRANULATION",
        "HYPERGRANULATION",
        "FIBRINBELAEGE",
        "KNOCHEN",
      ]),
    ).toEqual({
      EPITHEL: 1,
      GRANULATION: 2,
      FIBRIN: 1,
      NEKROSE: 0,
      TIEFE_STRUKTUREN: 1,
    });
  });

  it("ignoriert Befunde, die nicht Teil einer Diagrammgruppe sind", () => {
    expect(gruppiereWundgrund(["SONSTIGES", "HAEMATOME"])).toEqual({
      EPITHEL: 0,
      GRANULATION: 0,
      FIBRIN: 0,
      NEKROSE: 0,
      TIEFE_STRUKTUREN: 0,
    });
  });
});

describe("wundgrundAenderung", () => {
  it("liefert hinzugekommene und entfallene Befunde in Formularreihenfolge", () => {
    expect(
      wundgrundAenderung(
        ["FIBRINBELAEGE", "WEICHE_NEKROSE"],
        ["EPITHELGEWEBE", "GRANULATION", "FIBRINBELAEGE"],
      ),
    ).toEqual({
      hinzugekommen: ["Epithelgewebe/Inseln", "Granulation"],
      entfallen: ["Weiche/feuchte Nekrose"],
    });
  });
});

describe("zahlenDifferenz", () => {
  it("rechnet Vergleich minus Ausgang und rundet auf eine Nachkommastelle", () => {
    expect(zahlenDifferenz(12.35, 8.22)).toBe(-4.1);
  });

  it("liefert ohne vollstaendiges Wertepaar keine scheinbare Differenz", () => {
    expect(zahlenDifferenz(null, 8)).toBeNull();
    expect(zahlenDifferenz(8, undefined)).toBeNull();
  });
});
