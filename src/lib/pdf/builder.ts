/**
 * Schlankes Layout-Werkzeug fuer den PDF-Export, auf `pdf-lib` aufgesetzt.
 *
 * Es gibt bewusst kein Nachbau des DRACO-Papierbogens - das Original ist
 * fremdes Material und dient nur der optischen Orientierung. Stattdessen
 * entsteht ein eigenstaendiges Layout, das dieselbe Gliederung wie die
 * Leseansicht im Formular verwendet (siehe aufnahmen/[id]/page.tsx), damit
 * Bildschirm und Ausdruck inhaltlich immer uebereinstimmen.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

/**
 * Echte Schriftdateien statt `StandardFonts.Helvetica`: Die eingebauten
 * PDF-Standardschriften kommen ohne Unicode-Zuordnung (ToUnicode-CMap) -
 * Umlaute sehen im Ausdruck richtig aus, sind aber weder durchsuchbar noch
 * kopierbar. Dieselbe Schrift (Noto Sans) verwendet die Anwendung bereits
 * ueber `next/font/google`, siehe assets/fonts/README.md.
 */
const SCHRIFT_REGULAR = path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf");
const SCHRIFT_BOLD = path.join(process.cwd(), "assets/fonts/NotoSans-Bold.ttf");

const SEITE_BREITE = 595.28; // A4 in pt
const SEITE_HOEHE = 841.89;
const RAND = 50;
const INHALT_BREITE = SEITE_BREITE - RAND * 2;
const OBEN_START = SEITE_HOEHE - 58;
const UNTEN_GRENZE = 64;

const FARBE_TEXT = rgb(0.06, 0.09, 0.16);
const FARBE_GRAU = rgb(0.39, 0.45, 0.55);
const FARBE_PRIMAER = rgb(0.03, 0.44, 0.52);
const FARBE_LINIE = rgb(0.85, 0.88, 0.92);

const GROESSE_TITEL = 17;
const GROESSE_UNTERTITEL = 10;
const GROESSE_ABSCHNITT = 12;
const GROESSE_LABEL = 8.3;
const GROESSE_WERT = 10;
const GROESSE_FUSS = 8;

/**
 * Die eingebettete Schrift ist auf Latein/Interpunktion eingekuerzt (siehe
 * assets/fonts/README.md) und enthaelt kein echtes Minuszeichen (U+2212, aus
 * `formatiereProzent`) - ohne Ersatz wuerde `pdf-lib` beim Zeichnen abstuerzen.
 */
export function saniereText(text: string): string {
  return text.replace(/−/g, "-").replace(/ /g, " ");
}

/** Bricht einen Text bei gegebener Schriftgroesse auf eine maximale Breite um. */
export function umbrechen(text: string, font: PDFFont, groesse: number, maxBreite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of saniereText(text).split(/\n/)) {
    const woerter = absatz.split(/\s+/).filter(Boolean);
    if (woerter.length === 0) {
      zeilen.push("");
      continue;
    }
    let aktuell = woerter[0];
    for (const wort of woerter.slice(1)) {
      const kandidat = `${aktuell} ${wort}`;
      if (font.widthOfTextAtSize(kandidat, groesse) <= maxBreite) {
        aktuell = kandidat;
      } else {
        zeilen.push(aktuell);
        aktuell = wort;
      }
    }
    zeilen.push(aktuell);
  }
  return zeilen;
}

export type Angabe = readonly [label: string, wert: string | null | undefined];
export type Spalte = { titel: string; breite: number };

export class PdfBuilder {
  private doc!: PDFDocument;
  private schrift!: PDFFont;
  private schriftFett!: PDFFont;
  private page!: PDFPage;
  private y = OBEN_START;
  private erzeugtAm = new Date();

  private constructor() {}

  static async erstellen(): Promise<PdfBuilder> {
    const b = new PdfBuilder();
    b.doc = await PDFDocument.create();
    b.doc.registerFontkit(fontkit);
    b.doc.setProducer("WundDoku");
    b.doc.setCreator("WundDoku");
    const [regular, bold] = await Promise.all([readFile(SCHRIFT_REGULAR), readFile(SCHRIFT_BOLD)]);
    b.schrift = await b.doc.embedFont(regular, { subset: true });
    b.schriftFett = await b.doc.embedFont(bold, { subset: true });
    b.neueSeite();
    return b;
  }

  neueSeite(): void {
    this.page = this.doc.addPage([SEITE_BREITE, SEITE_HOEHE]);
    this.y = OBEN_START;
  }

  private sicherstellenPlatz(hoehe: number): void {
    if (this.y - hoehe < UNTEN_GRENZE) this.neueSeite();
  }

  private text(
    inhalt: string,
    x: number,
    y: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ): void {
    this.page.drawText(saniereText(inhalt), {
      x,
      y,
      size: opts.size ?? GROESSE_WERT,
      font: opts.font ?? this.schrift,
      color: opts.color ?? FARBE_TEXT,
    });
  }

  private linie(y: number, farbe = FARBE_LINIE, dicke = 0.75): void {
    this.page.drawLine({
      start: { x: RAND, y },
      end: { x: SEITE_BREITE - RAND, y },
      thickness: dicke,
      color: farbe,
    });
  }

  /** Kopfblock: Titel, Untertitel und eine trennende Linie. */
  kopf(titel: string, untertitel: string[]): void {
    this.sicherstellenPlatz(70);
    this.text(titel, RAND, this.y, { font: this.schriftFett, size: GROESSE_TITEL, color: FARBE_TEXT });
    this.y -= GROESSE_TITEL + 6;
    for (const zeile of untertitel) {
      if (!zeile) continue;
      this.text(zeile, RAND, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
      this.y -= GROESSE_UNTERTITEL + 5;
    }
    this.y -= 4;
    this.linie(this.y, FARBE_PRIMAER, 1.5);
    this.y -= 18;
  }

  /** Abschnittsueberschrift, wie die Karten-Titel im Formular ("Wundbefund" usw.). */
  abschnitt(titel: string): void {
    this.sicherstellenPlatz(34);
    this.y -= 6;
    this.text(titel, RAND, this.y, { font: this.schriftFett, size: GROESSE_ABSCHNITT, color: FARBE_PRIMAER });
    this.y -= 8;
    this.linie(this.y, FARBE_LINIE);
    this.y -= 16;
  }

  /**
   * Zweispaltiges Raster aus Label/Wert-Paaren, wie `<Angabe>` in der
   * Leseansicht. Leere Werte werden ausgelassen statt als "–" gedruckt -
   * ein Ausdruck mit 40 Gedankenstrichen waere weniger lesbar als gar keine
   * Zeile.
   */
  angaben(paare: readonly Angabe[]): void {
    const sichtbar = paare.filter(
      (p): p is [string, string] => p[1] != null && p[1].toString().trim() !== "",
    );
    if (sichtbar.length === 0) return;

    const luecke = 20;
    const spaltenBreite = (INHALT_BREITE - luecke) / 2;
    const zeilenHoehe = 12.5;

    for (let i = 0; i < sichtbar.length; i += 2) {
      const zeile = sichtbar.slice(i, i + 2);
      const zellen = zeile.map(([label, wert]) => ({
        label,
        zeilen: umbrechen(wert, this.schrift, GROESSE_WERT, spaltenBreite),
      }));
      const hoehe = Math.max(...zellen.map((z) => 13 + z.zeilen.length * zeilenHoehe)) + 8;
      this.sicherstellenPlatz(hoehe);

      zellen.forEach((z, idx) => {
        const x = RAND + idx * (spaltenBreite + luecke);
        this.text(z.label, x, this.y, { size: GROESSE_LABEL, color: FARBE_GRAU });
        let cy = this.y - 13;
        for (const zeile2 of z.zeilen) {
          this.text(zeile2, x, cy, { font: this.schriftFett, size: GROESSE_WERT });
          cy -= zeilenHoehe;
        }
      });
      this.y -= hoehe;
    }
  }

  /** Fliesstext ueber die volle Breite, z.B. laengere Freitextfelder. */
  absatz(text: string, opts: { size?: number; color?: ReturnType<typeof rgb> } = {}): void {
    if (!text.trim()) return;
    const groesse = opts.size ?? GROESSE_WERT;
    const zeilen = umbrechen(text, this.schrift, groesse, INHALT_BREITE);
    const zeilenHoehe = groesse + 3.5;
    this.sicherstellenPlatz(zeilen.length * zeilenHoehe + 6);
    for (const zeile of zeilen) {
      this.text(zeile, RAND, this.y, { size: groesse, color: opts.color });
      this.y -= zeilenHoehe;
    }
    this.y -= 6;
  }

  /** Einfache Tabelle mit fester Spaltenbreite, z.B. die Verlaufsuebersicht. */
  tabelle(spalten: Spalte[], zeilen: string[][]): void {
    const zeilenHoehe = 16;
    this.sicherstellenPlatz(zeilenHoehe * 2);
    let x = RAND;
    for (const spalte of spalten) {
      this.text(spalte.titel, x, this.y, { font: this.schriftFett, size: GROESSE_LABEL, color: FARBE_GRAU });
      x += spalte.breite;
    }
    this.y -= 8;
    this.linie(this.y, FARBE_LINIE);
    this.y -= 14;

    for (const zeile of zeilen) {
      this.sicherstellenPlatz(zeilenHoehe);
      x = RAND;
      zeile.forEach((wert, idx) => {
        this.text(wert, x, this.y, { size: GROESSE_WERT });
        x += spalten[idx]?.breite ?? 0;
      });
      this.y -= zeilenHoehe;
    }
    this.y -= 6;
  }

  /**
   * Bindet ein Foto ein (muss bereits JPEG sein - siehe `export.ts`, das
   * die als WebP gespeicherten Originale ueber `sharp` umkodiert, weil
   * `pdf-lib` kein WebP einbetten kann). Skaliert auf Inhaltsbreite, mit
   * Beschriftung darunter.
   */
  async foto(jpegBytes: Uint8Array, beschriftung?: string): Promise<void> {
    const bild = await this.doc.embedJpg(jpegBytes);
    const beschriftungHoehe = beschriftung ? 14 : 0;
    // Platz fuer die Beschriftung schon beim Skalieren abziehen, sonst passt
    // sie auf einer frischen Seite nicht mehr unter ein hoehenausfuellendes Foto.
    const maxHoehe = OBEN_START - UNTEN_GRENZE - beschriftungHoehe - 6;
    const skala = Math.min(INHALT_BREITE / bild.width, maxHoehe / bild.height);
    const breite = bild.width * skala;
    const hoehe = bild.height * skala;

    this.sicherstellenPlatz(hoehe + beschriftungHoehe + 12);
    const x = RAND + (INHALT_BREITE - breite) / 2;
    this.page.drawImage(bild, { x, y: this.y - hoehe, width: breite, height: hoehe });
    this.y -= hoehe + 6;
    if (beschriftung) {
      this.text(beschriftung, RAND, this.y, { size: GROESSE_LABEL, color: FARBE_GRAU });
      this.y -= beschriftungHoehe;
    }
    this.y -= 8;
  }

  /** Erzwingt einen Seitenumbruch, z.B. zwischen zwei Aufnahmen im Verlauf. */
  seitenumbruch(): void {
    this.neueSeite();
  }

  hinweis(text: string): void {
    this.sicherstellenPlatz(20);
    this.text(text, RAND, this.y, { size: GROESSE_WERT, color: FARBE_GRAU });
    this.y -= 20;
  }

  /** Stempelt Fusszeilen auf alle Seiten und liefert die fertigen Bytes. */
  async fertig(): Promise<Uint8Array> {
    const seiten = this.doc.getPages();
    const zeitstempel = this.erzeugtAm.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    seiten.forEach((seite, index) => {
      seite.drawLine({
        start: { x: RAND, y: 40 },
        end: { x: SEITE_BREITE - RAND, y: 40 },
        thickness: 0.5,
        color: FARBE_LINIE,
      });
      seite.drawText(saniereText(`WundDoku · erzeugt am ${zeitstempel}`), {
        x: RAND,
        y: 28,
        size: GROESSE_FUSS,
        font: this.schrift,
        color: FARBE_GRAU,
      });
      const seitenzahl = `Seite ${index + 1} von ${seiten.length}`;
      const breite = this.schrift.widthOfTextAtSize(seitenzahl, GROESSE_FUSS);
      seite.drawText(seitenzahl, {
        x: SEITE_BREITE - RAND - breite,
        y: 28,
        size: GROESSE_FUSS,
        font: this.schrift,
        color: FARBE_GRAU,
      });
    });
    return this.doc.save();
  }
}

export const PDF_LAYOUT = { SEITE_BREITE, SEITE_HOEHE, RAND, INHALT_BREITE };
