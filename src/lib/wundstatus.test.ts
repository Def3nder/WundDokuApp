import { describe, expect, it } from "vitest";
import { statuswechsel } from "./wundstatus";

const aufnahmedatum = new Date(2026, 8, 14);

describe("statuswechsel", () => {
  it("schliesst die Wunde mit dem Aufnahmedatum ab", () => {
    // Nicht mit dem Speicherzeitpunkt: Bei nachgetragenen Terminen zaehlt der
    // Behandlungstag.
    expect(statuswechsel(true, aufnahmedatum, false)).toEqual({
      abgeschlossenAm: aufnahmedatum,
      protokoll: "abgeschlossen",
    });
  });

  it("schliesst auch ab, wenn die Wunde bereits abgeschlossen war", () => {
    expect(statuswechsel(true, aufnahmedatum, true)?.abgeschlossenAm).toBe(aufnahmedatum);
  });

  it("eroeffnet wieder, wenn diese Aufnahme den Abschluss traegt", () => {
    expect(statuswechsel(false, aufnahmedatum, true)).toEqual({
      abgeschlossenAm: null,
      protokoll: "wiedereröffnet",
    });
  });

  it("laesst den Status sonst unberuehrt", () => {
    // Das Korrigieren einer alten Aufnahme darf eine spaeter abgeheilte Wunde
    // nicht unbemerkt wieder oeffnen.
    expect(statuswechsel(false, aufnahmedatum, false)).toBeNull();
  });
});
