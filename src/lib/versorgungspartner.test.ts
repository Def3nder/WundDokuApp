import { describe, expect, it } from "vitest";
import {
  filtereVersorgungspartner,
  normalisiereVersorgungspartnerSuche,
  type VersorgungspartnerOption,
} from "./versorgungspartner";

const AERZTE: VersorgungspartnerOption[] = [
  { id: "1", name: "Dr. med. Katharina Schneider", zusatz: "Hausarztpraxis am Markt" },
  { id: "2", name: "Prof. Dr. Laura König", zusatz: "Praxis für Angiologie" },
];

describe("Versorgungspartner-Suche", () => {
  it("ignoriert Großschreibung, Satzzeichen und Umlaute", () => {
    expect(normalisiereVersorgungspartnerSuche("Prof. KÖNIG")).toBe("prof konig");
  });

  it.each(["schneider", "katharina", "dr schneider", "praxis markt"])(
    "findet Arzt mit %s",
    (suche) => {
      expect(filtereVersorgungspartner(AERZTE, suche).map((arzt) => arzt.id)).toEqual(["1"]);
    },
  );

  it("findet Titel und Namen auch ohne Umlaut", () => {
    expect(filtereVersorgungspartner(AERZTE, "prof konig").map((arzt) => arzt.id)).toEqual([
      "2",
    ]);
  });

  it("zeigt bei leerer Suche alle Einträge in ihrer Reihenfolge", () => {
    expect(filtereVersorgungspartner(AERZTE, "  ")).toEqual(AERZTE);
  });
});
