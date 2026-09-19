import { describe, expect, it } from "vitest";
import { AUSRICHTUNGEN, KOERPERREGIONEN, SEITEN } from "./enums";
import {
  KOERPERKARTE_BREITE,
  KOERPERKARTE_HOEHE,
  KOERPERKARTE_MARKER,
} from "./koerperkarte";

const regionWerte = new Set<string>(KOERPERREGIONEN.map((r) => r.wert));
const seiteWerte = new Set<string>(SEITEN.map((s) => s.wert));
const ausrichtungWerte = new Set<string>(AUSRICHTUNGEN.map((a) => a.wert));

describe("KOERPERKARTE_MARKER", () => {
  it("verweist bei jeder Markierung auf einen gültigen Enum-Wert", () => {
    for (const m of KOERPERKARTE_MARKER) {
      expect(regionWerte.has(m.region), `Region ${m.region}`).toBe(true);
      if (m.seite !== null) {
        expect(seiteWerte.has(m.seite), `Seite ${m.seite}`).toBe(true);
      }
      if (m.ausrichtung !== null) {
        expect(ausrichtungWerte.has(m.ausrichtung), `Ausrichtung ${m.ausrichtung}`).toBe(true);
      }
    }
  });

  it("liegt mit x/y innerhalb des Bildes", () => {
    for (const m of KOERPERKARTE_MARKER) {
      expect(m.x).toBeGreaterThan(0);
      expect(m.x).toBeLessThan(100);
      expect(m.y).toBeGreaterThan(0);
      expect(m.y).toBeLessThan(100);
    }
  });

  it("hat keine zwei Markierungen an derselben Stelle", () => {
    const orte = KOERPERKARTE_MARKER.map((m) => `${m.x},${m.y}`);
    expect(new Set(orte).size).toBe(orte.length);
  });

  it("hat 67 Markierungen wie in der Vorlage", () => {
    expect(KOERPERKARTE_MARKER.length).toBe(67);
  });

  it("hält zu jeder Nachbarmarkierung genug Abstand für 24px-Zielflächen (WCAG SC 2.5.8)", () => {
    // Muss mit der max-w in koerperkarte.tsx übereinstimmen - dort breit genug
    // gewählt, damit selbst die beiden eng benachbarten Kopf-Punkte den
    // Mindestabstand einhalten (axe prüft das, siehe SESSION.md).
    const angezeigteBreite = 720;
    const skalierung = angezeigteBreite / KOERPERKARTE_BREITE;
    const mindestabstandPx = 24;

    for (let i = 0; i < KOERPERKARTE_MARKER.length; i += 1) {
      let kleinsterAbstand = Infinity;
      for (let j = 0; j < KOERPERKARTE_MARKER.length; j += 1) {
        if (i === j) continue;
        const dx = (KOERPERKARTE_MARKER[i].x - KOERPERKARTE_MARKER[j].x) / 100 * KOERPERKARTE_BREITE;
        const dy = (KOERPERKARTE_MARKER[i].y - KOERPERKARTE_MARKER[j].y) / 100 * KOERPERKARTE_HOEHE;
        const abstand = Math.hypot(dx, dy) * skalierung;
        if (abstand < kleinsterAbstand) kleinsterAbstand = abstand;
      }
      expect(
        kleinsterAbstand,
        `Markierung #${i} (${KOERPERKARTE_MARKER[i].region} ${KOERPERKARTE_MARKER[i].seite ?? ""}) liegt zu nah an einer Nachbarmarkierung`,
      ).toBeGreaterThanOrEqual(mindestabstandPx);
    }
  });
});
