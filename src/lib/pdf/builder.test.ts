import { describe, expect, it } from "vitest";
import { StandardFonts, PDFDocument } from "pdf-lib";
import { saniereText, umbrechen } from "./builder";

describe("saniereText", () => {
  it("ersetzt das echte Minuszeichen, das WinAnsi nicht kodieren kann", () => {
    expect(saniereText("−60,3 %")).toBe("-60,3 %");
  });

  it("laesst normalen Text unveraendert", () => {
    expect(saniereText("Mäßige bis starke")).toBe("Mäßige bis starke");
  });
});

describe("umbrechen", () => {
  it("bricht nur um, wenn die Breite ueberschritten wird", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const breit = font.widthOfTextAtSize("Ein kurzer Satz mit genug Platz", 10) + 20;
    expect(umbrechen("Ein kurzer Satz mit genug Platz", font, 10, breit)).toEqual([
      "Ein kurzer Satz mit genug Platz",
    ]);
  });

  it("bricht lange Texte auf mehrere Zeilen um", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const zeilen = umbrechen(
      "Dieser Text ist so lang, dass er auf jeden Fall auf mehrere Zeilen umgebrochen werden muss",
      font,
      10,
      120,
    );
    expect(zeilen.length).toBeGreaterThan(1);
    for (const zeile of zeilen) {
      expect(font.widthOfTextAtSize(zeile, 10)).toBeLessThanOrEqual(120);
    }
  });

  it("behaelt Absaetze (Zeilenumbrueche) bei", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(umbrechen("Erste Zeile\nZweite Zeile", font, 10, 400)).toEqual([
      "Erste Zeile",
      "Zweite Zeile",
    ]);
  });

  it("gibt eine leere Zeile fuer leere Absaetze zurueck", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(umbrechen("Erste\n\nDritte", font, 10, 400)).toEqual(["Erste", "", "Dritte"]);
  });
});
