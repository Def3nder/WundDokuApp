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
import { LineCapStyle, PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

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
const FARBE_FLAECHE = rgb(0.95, 0.98, 0.98);
const FARBE_ZEBRA = rgb(0.97, 0.98, 0.99);
const FARBE_WEISS = rgb(1, 1, 1);

/**
 * Dieselbe Staffelung wie `--chart-1` bis `--chart-5` im Hell-Farbschema
 * (globals.css) - das PDF kennt keinen Dark Mode, also fest die Druckwerte.
 */
const FARBE_DIAGRAMM = [
  rgb(0.055, 0.455, 0.565), // chart-1 #0e7490
  rgb(0.02, 0.588, 0.412), // chart-2 #059669
  rgb(0.706, 0.325, 0.035), // chart-3 #b45309
  rgb(0.486, 0.227, 0.929), // chart-4 #7c3aed
  rgb(0.745, 0.071, 0.235), // chart-5 #be123c
];

const GROESSE_TITEL = 17;
const GROESSE_UNTERTITEL = 10;
const GROESSE_ABSCHNITT = 12;
const GROESSE_LABEL = 8.3;
const GROESSE_WERT = 10;
const GROESSE_FUSS = 8;

const ZAHL_DE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** Rundet eine Achsenobergrenze auf eine "schoene" Zahl auf (1/2/2,5/5/10 * 10^n). */
function schoeneObergrenze(wert: number): number {
  if (wert <= 0) return 1;
  const groessenordnung = 10 ** Math.floor(Math.log10(wert));
  for (const schritt of [1, 2, 2.5, 5, 10]) {
    const kandidat = schritt * groessenordnung;
    if (kandidat >= wert - 1e-9) return kandidat;
  }
  return 10 * groessenordnung;
}

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

export type Angabe = readonly [label: string, wert: string | null | undefined, span?: 1 | 2 | 3];
export type Spalte = { titel: string; breite: number };
export type PdfFoto = { bytes: Uint8Array; beschriftung?: string };
export type VerlaufZeile = {
  nummer: number;
  datum: string;
  typ: string;
  flaeche: string;
  trend: string;
  fotos: number;
};

/**
 * Eine Datenreihe fuer `liniendiagramm`. Ohne eigene `domain` teilt sich eine
 * Serie die automatisch berechnete Standardachse mit allen anderen Serien
 * ohne `domain` (z.B. Breite/Laenge/Tiefe auf derselben mm-Achse). Serien mit
 * `domain` bekommen eine eigene, unabhaengige Achse (z.B. Schmerz-VAS 0-10
 * neben Exsudat 0-3) - analog zu den zwei `YAxis` im Bildschirm-Diagramm.
 */
export type PdfDiagrammSerie = {
  name: string;
  farbe: ReturnType<typeof rgb>;
  werte: readonly (number | null)[];
  domain?: readonly [number, number];
  gestrichelt?: boolean;
  flaeche?: boolean;
};

export const PDF_DIAGRAMM_FARBEN = FARBE_DIAGRAMM;

export class PdfBuilder {
  private doc!: PDFDocument;
  private schrift!: PDFFont;
  private schriftFett!: PDFFont;
  private page!: PDFPage;
  private y = OBEN_START;
  private erzeugtAm = new Date();

  /**
   * Interne PDF-Links (z.B. von der Verlaufsuebersicht zur jeweiligen
   * Aufnahme): Sprungziele werden gesetzt, sobald die Zielstelle gezeichnet
   * wird; anklickbare Bereiche koennen aber schon vorher entstehen (die
   * Uebersichtstabelle steht vor den Aufnahmen). Beide Listen werden erst in
   * `fertig()` zusammengefuehrt, wenn alle Sprungziele bekannt sind.
   */
  private sprungziele = new Map<string, { seite: PDFPage; y: number }>();
  private ausstehendeLinks: {
    seite: PDFPage;
    x: number;
    y: number;
    breite: number;
    hoehe: number;
    zielId: string;
  }[] = [];

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

  /** Erlaubt dem Export, einen groesseren zusammengehoerigen Block vorab einzuplanen. */
  hatPlatz(hoehe: number): boolean {
    return this.y - hoehe >= UNTEN_GRENZE;
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

  /** Merkt sich die aktuelle Position als Sprungziel fuer interne PDF-Links. */
  private setzeSprungziel(id: string, y: number): void {
    this.sprungziele.set(id, { seite: this.page, y });
  }

  /** Reserviert einen anklickbaren Bereich, der in `fertig()` mit seinem Sprungziel verknuepft wird. */
  private merkeLink(zielId: string, rect: { x: number; y: number; breite: number; hoehe: number }): void {
    this.ausstehendeLinks.push({ seite: this.page, zielId, ...rect });
  }

  /** Baut aus den gemerkten Bereichen und Sprungzielen echte PDF-Link-Annotationen. */
  private verknuepfeLinks(): void {
    for (const link of this.ausstehendeLinks) {
      const ziel = this.sprungziele.get(link.zielId);
      if (!ziel) continue;
      const annotation = this.doc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [link.x, link.y, link.x + link.breite, link.y + link.hoehe],
        Border: [0, 0, 0],
        Dest: [ziel.seite.ref, "XYZ", null, ziel.y, null],
      });
      link.seite.node.addAnnot(this.doc.context.register(annotation));
    }
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

  /** Praesenter Dokumentkopf mit Patient und Wunde als erster visueller Ebene. */
  identitaetsKopf(patient: string, wunde: string, metadaten: string[]): void {
    const sichtbar = metadaten.filter(Boolean);
    this.sicherstellenPlatz(66 + sichtbar.length * 14);
    this.text(patient, RAND, this.y, { font: this.schriftFett, size: 20, color: FARBE_TEXT });
    this.y -= 25;
    this.text(wunde, RAND, this.y, { font: this.schriftFett, size: 14, color: FARBE_PRIMAER });
    this.y -= 19;
    for (const zeile of sichtbar) {
      this.text(zeile, RAND, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
      this.y -= 14;
    }
    this.y -= 2;
    this.linie(this.y, FARBE_PRIMAER, 1.5);
    this.y -= 14;
  }

  /** Zweispaltiger Kopf: Aufnahme/Befund links, Patientendaten rechts. */
  aufnahmeKopf({
    aufnahme,
    befund,
    linksUnten,
    patient,
    patientMeta,
  }: {
    aufnahme: string;
    befund: string;
    linksUnten?: string;
    patient: string;
    patientMeta: string[];
  }): void {
    const luecke = 24;
    const spaltenBreite = (INHALT_BREITE - luecke) / 2;
    const rechts = RAND + spaltenBreite + luecke;
    const titelGroesse = 14;
    const linkerTitel = umbrechen(aufnahme, this.schriftFett, titelGroesse, spaltenBreite);
    const rechterTitel = umbrechen(patient, this.schriftFett, titelGroesse, spaltenBreite);
    const titelZeilen = Math.max(linkerTitel.length, rechterTitel.length);
    const hoehe = 58 + titelZeilen * 17 + Math.max(linksUnten ? 1 : 0, patientMeta.filter(Boolean).length) * 14;
    this.sicherstellenPlatz(hoehe);

    linkerTitel.forEach((zeile, index) =>
      this.text(zeile, RAND, this.y - index * 17, { font: this.schriftFett, size: titelGroesse, color: FARBE_PRIMAER }),
    );
    rechterTitel.forEach((zeile, index) =>
      this.text(zeile, rechts, this.y - index * 17, { font: this.schriftFett, size: titelGroesse, color: FARBE_TEXT }),
    );
    this.y -= titelZeilen * 17 + 6;
    this.text(`Befund: ${befund}`, RAND, this.y, { font: this.schriftFett, size: 11, color: FARBE_TEXT });
    if (patientMeta[0]) this.text(patientMeta[0], rechts, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
    this.y -= 16;
    if (linksUnten) this.text(linksUnten, RAND, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
    if (patientMeta[1]) this.text(patientMeta[1], rechts, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
    this.y -= 16;
    for (const zeile of patientMeta.slice(2).filter(Boolean)) {
      this.text(zeile, rechts, this.y, { size: GROESSE_UNTERTITEL, color: FARBE_GRAU });
      this.y -= 14;
    }
    this.y -= 2;
    this.linie(this.y, FARBE_PRIMAER, 1.5);
    this.y -= 14;
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

  /** Haelt Ueberschrift und alle Angaben nach Moeglichkeit auf derselben Seite. */
  angabenBlock(titel: string, paare: readonly Angabe[]): void {
    const sichtbar = paare.filter(
      (p): p is [string, string, (1 | 2 | 3)?] => p[1] != null && p[1].toString().trim() !== "",
    );
    if (sichtbar.length === 0) return;

    const innenRand = 10;
    const luecke = 12;
    const innenBreite = INHALT_BREITE - innenRand * 2;
    const einheit = (innenBreite - luecke * 2) / 3;
    const zeilenHoehe = 12.5;
    const zellen = sichtbar.map(([label, wert, vorgegebenerSpan]) => {
      const laenge = Math.max(label.length, wert.length);
      const span = vorgegebenerSpan ?? (laenge > 58 ? 3 : laenge > 25 ? 2 : 1);
      const breite = einheit * span + luecke * (span - 1);
      return { label, wert, span, breite, zeilen: umbrechen(wert, this.schrift, GROESSE_WERT, breite) };
    });
    const zeilen: typeof zellen[] = [];
    let aktuell: typeof zellen = [];
    let belegt = 0;
    for (const zelle of zellen) {
      if (belegt + zelle.span > 3) {
        zeilen.push(aktuell);
        aktuell = [];
        belegt = 0;
      }
      aktuell.push(zelle);
      belegt += zelle.span;
    }
    if (aktuell.length) zeilen.push(aktuell);

    const zeilenHoehen = zeilen.map((zeile) =>
      Math.max(...zeile.map((zelle) => 13 + zelle.zeilen.length * zeilenHoehe)) + 8,
    );
    const kopfHoehe = 27;
    const kartenHoehe = kopfHoehe + 10 + zeilenHoehen.reduce((summe, hoehe) => summe + hoehe, 0) + 6;

    this.sicherstellenPlatz(kartenHoehe + 10);
    const oben = this.y;
    this.page.drawRectangle({
      x: RAND,
      y: oben - kartenHoehe,
      width: INHALT_BREITE,
      height: kartenHoehe,
      borderColor: FARBE_LINIE,
      borderWidth: 0.75,
    });
    this.page.drawRectangle({
      x: RAND,
      y: oben - kopfHoehe,
      width: INHALT_BREITE,
      height: kopfHoehe,
      color: FARBE_FLAECHE,
    });
    this.text(titel, RAND + innenRand, oben - 18, {
      font: this.schriftFett,
      size: GROESSE_ABSCHNITT,
      color: FARBE_PRIMAER,
    });

    let cy = oben - kopfHoehe - 10;
    zeilen.forEach((zeile, zeilenIndex) => {
      let verwendeteSpalten = 0;
      for (const zelle of zeile) {
        const x = RAND + innenRand + verwendeteSpalten * (einheit + luecke);
        this.text(zelle.label, x, cy, { size: GROESSE_LABEL, color: FARBE_GRAU });
        let wertY = cy - 13;
        for (const text of zelle.zeilen) {
          this.text(text, x, wertY, { font: this.schriftFett, size: GROESSE_WERT });
          wertY -= zeilenHoehe;
        }
        verwendeteSpalten += zelle.span;
      }
      cy -= zeilenHoehen[zeilenIndex];
    });
    this.y = oben - kartenHoehe - 10;
  }

  /** Auffaellige, nummerierte Uebersicht aller Aufnahmen im Verlauf. */
  verlaufsUebersicht(zeilen: readonly VerlaufZeile[]): void {
    this.abschnitt("Aufnahmen im Verlauf");
    this.text("Klick auf eine Zeile springt zur passenden Aufnahme im Dokument.", RAND, this.y, {
      size: GROESSE_LABEL,
      color: FARBE_GRAU,
    });
    this.y -= 16;
    const kopfHoehe = 22;
    const zeilenHoehe = 28;
    const spalten = [34, 76, 128, 78, 95, 54];
    const titel = ["Nr.", "Datum", "Aufnahmetyp", "Fläche", "Veränderung", "Fotos"];

    const kopf = () => {
      this.sicherstellenPlatz(kopfHoehe + zeilenHoehe);
      this.page.drawRectangle({ x: RAND, y: this.y - kopfHoehe + 5, width: INHALT_BREITE, height: kopfHoehe, color: FARBE_FLAECHE });
      let x = RAND + 7;
      titel.forEach((wert, index) => {
        this.text(wert, x, this.y - 9, { font: this.schriftFett, size: GROESSE_LABEL, color: FARBE_GRAU });
        x += spalten[index];
      });
      this.y -= kopfHoehe;
    };

    kopf();
    zeilen.forEach((zeile, index) => {
      if (!this.hatPlatz(zeilenHoehe)) {
        this.neueSeite();
        kopf();
      }
      if (index % 2 === 1) {
        this.page.drawRectangle({ x: RAND, y: this.y - zeilenHoehe + 5, width: INHALT_BREITE, height: zeilenHoehe, color: FARBE_ZEBRA });
      }
      this.page.drawRectangle({ x: RAND + 6, y: this.y - 20, width: 22, height: 19, color: FARBE_PRIMAER });
      const nr = String(zeile.nummer).padStart(2, "0");
      const nrBreite = this.schriftFett.widthOfTextAtSize(nr, GROESSE_LABEL);
      this.text(nr, RAND + 17 - nrBreite / 2, this.y - 14, { font: this.schriftFett, size: GROESSE_LABEL, color: FARBE_WEISS });
      const werte = [zeile.datum, zeile.typ, zeile.flaeche, zeile.trend || "–", String(zeile.fotos)];
      let x = RAND + spalten[0] + 7;
      werte.forEach((wert, wertIndex) => {
        this.text(wert, x, this.y - 14, {
          font: wertIndex < 2 ? this.schriftFett : this.schrift,
          size: wertIndex === 1 ? GROESSE_LABEL : GROESSE_WERT,
        });
        x += spalten[wertIndex + 1];
      });
      this.merkeLink(String(zeile.nummer), {
        x: RAND,
        y: this.y - zeilenHoehe + 5,
        breite: INHALT_BREITE,
        hoehe: zeilenHoehe,
      });
      this.y -= zeilenHoehe;
    });
    this.y -= 8;
  }

  /** Kartenrahmen mit Titel/Beschreibung fuer eine leere Diagrammserie - Aequivalent zu `KeineMesswerte` auf dem Bildschirm. */
  private diagrammPlatzhalter(titel: string, beschreibung: string, hinweistext: string): void {
    const innenRand = 12;
    const kartenHoehe = 90;
    this.sicherstellenPlatz(kartenHoehe + 10);
    const oben = this.y;
    this.page.drawRectangle({
      x: RAND,
      y: oben - kartenHoehe,
      width: INHALT_BREITE,
      height: kartenHoehe,
      borderColor: FARBE_LINIE,
      borderWidth: 0.75,
    });
    this.text(titel, RAND + innenRand, oben - 18, { font: this.schriftFett, size: GROESSE_ABSCHNITT, color: FARBE_PRIMAER });
    if (beschreibung) this.text(beschreibung, RAND + innenRand, oben - 31, { size: GROESSE_LABEL, color: FARBE_GRAU });
    const textBreite = this.schrift.widthOfTextAtSize(hinweistext, GROESSE_WERT);
    this.text(hinweistext, RAND + (INHALT_BREITE - textBreite) / 2, oben - kartenHoehe / 2 - 4, {
      size: GROESSE_WERT,
      color: FARBE_GRAU,
    });
    this.y = oben - kartenHoehe - 10;
  }

  /** Zeichnet moeglichst wenige, ueberlappungsfreie x-Achsen-Beschriftungen unter den gegebenen Positionen. */
  private diagrammXAchse(labels: readonly string[], xPositionen: readonly number[], y: number): void {
    const n = labels.length;
    if (n === 0) return;
    const maxLabelBreite = Math.max(...labels.map((l) => this.schrift.widthOfTextAtSize(l, GROESSE_LABEL)));
    const platzProLabel = maxLabelBreite + 10;
    const gesamtbreite = xPositionen[n - 1] - xPositionen[0] || 1;
    const maxAnzahl = Math.max(2, Math.floor(gesamtbreite / platzProLabel) + 1);
    const indizes = new Set<number>([0, n - 1]);
    if (n <= maxAnzahl) {
      for (let i = 0; i < n; i++) indizes.add(i);
    } else {
      const schritt = (n - 1) / (maxAnzahl - 1);
      for (let i = 0; i < maxAnzahl; i++) indizes.add(Math.round(i * schritt));
    }
    for (const index of [...indizes].sort((a, b) => a - b)) {
      const breite = this.schrift.widthOfTextAtSize(labels[index], GROESSE_LABEL);
      const x = Math.min(Math.max(xPositionen[index] - breite / 2, RAND), RAND + INHALT_BREITE - breite);
      this.text(labels[index], x, y, { size: GROESSE_LABEL, color: FARBE_GRAU });
    }
  }

  /** Legende mit Farbpunkt je Serie, wird nur bei mehr als einer Serie gebraucht. */
  private diagrammLegende(serien: readonly { name: string; farbe: ReturnType<typeof rgb> }[], y: number): void {
    let x = RAND + 12;
    for (const serie of serien) {
      this.page.drawRectangle({ x, y: y - 1, width: 8, height: 8, color: serie.farbe });
      this.text(serie.name, x + 12, y, { size: GROESSE_LABEL, color: FARBE_GRAU });
      x += 12 + this.schrift.widthOfTextAtSize(serie.name, GROESSE_LABEL) + 16;
    }
  }

  /**
   * Liniendiagramm mit einer oder mehreren Serien - fuer Wundflaeche (mit
   * Flaechenfuellung), Abmessungen (drei Serien, eine gemeinsame Achse) und
   * Schmerz/Exsudat (zwei Serien mit je eigener `domain`, analog zu den
   * beiden `YAxis` im Bildschirm-Diagramm).
   */
  liniendiagramm(
    titel: string,
    beschreibung: string,
    xLabels: readonly string[],
    serien: readonly PdfDiagrammSerie[],
  ): void {
    const hatWerte = xLabels.length > 0 && serien.some((s) => s.werte.some((w) => w != null));
    if (!hatWerte) {
      this.diagrammPlatzhalter(titel, beschreibung, "Für diesen Verlauf liegen noch keine Messwerte vor.");
      return;
    }

    const ohneEigeneDomain = serien.filter((s) => !s.domain);
    const standardDomain: readonly [number, number] = ohneEigeneDomain.length
      ? [0, schoeneObergrenze(Math.max(1e-9, ...ohneEigeneDomain.flatMap((s) => s.werte).filter((w): w is number => w != null)) * 1.15)]
      : [0, 1];
    const domainVon = (s: PdfDiagrammSerie) => s.domain ?? standardDomain;
    const linksDomain = domainVon(serien[0]);
    const rechtsSerie = serien.find((s) => {
      const d = domainVon(s);
      return d[0] !== linksDomain[0] || d[1] !== linksDomain[1];
    });
    const rechtsDomain = rechtsSerie ? domainVon(rechtsSerie) : null;

    const innenRand = 12;
    const linksAchsenBreite = 32;
    const rechtsAchsenBreite = rechtsDomain ? 30 : 0;
    const plotHoehe = 118;
    const xAchsenHoehe = 16;
    const legendeHoehe = serien.length > 1 ? 16 : 4;
    const kopfHoehe = beschreibung ? 42 : 26;
    const kartenHoehe = kopfHoehe + plotHoehe + xAchsenHoehe + legendeHoehe + innenRand;

    this.sicherstellenPlatz(kartenHoehe + 10);
    const oben = this.y;
    this.page.drawRectangle({
      x: RAND,
      y: oben - kartenHoehe,
      width: INHALT_BREITE,
      height: kartenHoehe,
      borderColor: FARBE_LINIE,
      borderWidth: 0.75,
    });
    this.text(titel, RAND + innenRand, oben - 18, { font: this.schriftFett, size: GROESSE_ABSCHNITT, color: FARBE_PRIMAER });
    if (beschreibung) this.text(beschreibung, RAND + innenRand, oben - 31, { size: GROESSE_LABEL, color: FARBE_GRAU });

    const plotX = RAND + innenRand + linksAchsenBreite;
    const plotBreite = INHALT_BREITE - innenRand * 2 - linksAchsenBreite - rechtsAchsenBreite;
    const plotOben = oben - kopfHoehe;
    const plotUnten = plotOben - plotHoehe;
    const n = xLabels.length;
    const px = (index: number) => (n === 1 ? plotX + plotBreite / 2 : plotX + (plotBreite * index) / (n - 1));

    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const y = plotUnten + plotHoehe * frac;
      this.page.drawLine({
        start: { x: plotX, y },
        end: { x: plotX + plotBreite, y },
        thickness: i === 0 ? 1 : 0.5,
        color: i === 0 ? FARBE_GRAU : FARBE_LINIE,
      });
      const linksWert = ZAHL_DE.format(linksDomain[0] + (linksDomain[1] - linksDomain[0]) * frac);
      const linksBreite = this.schrift.widthOfTextAtSize(linksWert, GROESSE_LABEL);
      this.text(linksWert, plotX - 6 - linksBreite, y - 3, { size: GROESSE_LABEL, color: FARBE_GRAU });
      if (rechtsDomain) {
        const rechtsWert = ZAHL_DE.format(rechtsDomain[0] + (rechtsDomain[1] - rechtsDomain[0]) * frac);
        this.text(rechtsWert, plotX + plotBreite + 6, y - 3, { size: GROESSE_LABEL, color: FARBE_GRAU });
      }
    }

    this.diagrammXAchse(
      xLabels,
      Array.from({ length: n }, (_, i) => px(i)),
      plotUnten - 11,
    );

    for (const serie of serien) {
      const domain = domainVon(serie);
      const skala = plotHoehe / (domain[1] - domain[0] || 1);
      const punkte = serie.werte
        .map((wert, index) =>
          wert == null ? null : { x: px(index), y: plotUnten + (wert - domain[0]) * skala },
        )
        .filter((p): p is { x: number; y: number } => p != null);
      if (punkte.length === 0) continue;

      if (serie.flaeche && punkte.length >= 2) {
        const pfad = [
          `M ${punkte[0].x},${-punkte[0].y}`,
          ...punkte.slice(1).map((p) => `L ${p.x},${-p.y}`),
          `L ${punkte[punkte.length - 1].x},${-plotUnten}`,
          `L ${punkte[0].x},${-plotUnten}`,
          "Z",
        ].join(" ");
        this.page.drawSvgPath(pfad, { x: 0, y: 0, color: serie.farbe, opacity: 0.16 });
      }

      if (punkte.length >= 2) {
        const linie = punkte.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${-p.y}`).join(" ");
        this.page.drawSvgPath(linie, {
          x: 0,
          y: 0,
          borderColor: serie.farbe,
          borderWidth: 1.6,
          borderLineCap: LineCapStyle.Round,
          borderDashArray: serie.gestrichelt ? [5, 3] : undefined,
        });
      }

      for (const p of punkte) {
        this.page.drawCircle({ x: p.x, y: p.y, size: 2.4, color: FARBE_WEISS, borderColor: serie.farbe, borderWidth: 1.6 });
      }
    }

    if (serien.length > 1) {
      this.diagrammLegende(serien, plotUnten - xAchsenHoehe - 10);
    }

    this.y = oben - kartenHoehe - 10;
  }

  /** Gestapeltes Balkendiagramm, z.B. die Wundgrund-Zusammensetzung je Aufnahme. */
  gestapeltesBalkendiagramm(
    titel: string,
    beschreibung: string,
    xLabels: readonly string[],
    serien: readonly { name: string; farbe: ReturnType<typeof rgb>; werte: readonly number[] }[],
  ): void {
    const summen = xLabels.map((_, index) => serien.reduce((summe, s) => summe + (s.werte[index] ?? 0), 0));
    const hatWerte = summen.some((summe) => summe > 0);
    if (!hatWerte) {
      this.diagrammPlatzhalter(titel, beschreibung, "Für diesen Verlauf liegen noch keine gruppierbaren Befunde vor.");
      return;
    }

    const domainMax = schoeneObergrenze(Math.max(...summen));
    const innenRand = 12;
    const linksAchsenBreite = 22;
    const plotHoehe = 118;
    const xAchsenHoehe = 16;
    const legendeHoehe = 16;
    const kopfHoehe = beschreibung ? 42 : 26;
    const kartenHoehe = kopfHoehe + plotHoehe + xAchsenHoehe + legendeHoehe + innenRand;

    this.sicherstellenPlatz(kartenHoehe + 10);
    const oben = this.y;
    this.page.drawRectangle({
      x: RAND,
      y: oben - kartenHoehe,
      width: INHALT_BREITE,
      height: kartenHoehe,
      borderColor: FARBE_LINIE,
      borderWidth: 0.75,
    });
    this.text(titel, RAND + innenRand, oben - 18, { font: this.schriftFett, size: GROESSE_ABSCHNITT, color: FARBE_PRIMAER });
    if (beschreibung) this.text(beschreibung, RAND + innenRand, oben - 31, { size: GROESSE_LABEL, color: FARBE_GRAU });

    const plotX = RAND + innenRand + linksAchsenBreite;
    const plotBreite = INHALT_BREITE - innenRand * 2 - linksAchsenBreite;
    const plotOben = oben - kopfHoehe;
    const plotUnten = plotOben - plotHoehe;
    const n = xLabels.length;
    const slotBreite = plotBreite / n;
    const balkenBreite = Math.min(36, slotBreite * 0.55);

    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const y = plotUnten + plotHoehe * frac;
      this.page.drawLine({
        start: { x: plotX, y },
        end: { x: plotX + plotBreite, y },
        thickness: i === 0 ? 1 : 0.5,
        color: i === 0 ? FARBE_GRAU : FARBE_LINIE,
      });
      const wert = ZAHL_DE.format(domainMax * frac);
      const breite = this.schrift.widthOfTextAtSize(wert, GROESSE_LABEL);
      this.text(wert, plotX - 6 - breite, y - 3, { size: GROESSE_LABEL, color: FARBE_GRAU });
    }

    const slotMitten = xLabels.map((_, i) => plotX + slotBreite * (i + 0.5));
    this.diagrammXAchse(xLabels, slotMitten, plotUnten - 11);

    xLabels.forEach((_, i) => {
      let cy = plotUnten;
      for (const serie of serien) {
        const wert = serie.werte[i] ?? 0;
        if (wert <= 0) continue;
        const hoehe = (wert / domainMax) * plotHoehe;
        this.page.drawRectangle({ x: slotMitten[i] - balkenBreite / 2, y: cy, width: balkenBreite, height: hoehe, color: serie.farbe });
        cy += hoehe;
      }
    });

    this.diagrammLegende(serien, plotUnten - xAchsenHoehe - 10);
    this.y = oben - kartenHoehe - 10;
  }

  /** Wiedererkennbare Nummer vor jedem Detailbefund. */
  aufnahmeBanner(nummer: number, titel: string, untertitel?: string): void {
    const hoehe = untertitel ? 47 : 35;
    this.sicherstellenPlatz(hoehe + 12);
    this.setzeSprungziel(String(nummer), Math.min(this.y + 14, SEITE_HOEHE - 12));
    this.page.drawRectangle({ x: RAND, y: this.y - hoehe, width: INHALT_BREITE, height: hoehe, color: FARBE_FLAECHE, borderColor: FARBE_LINIE, borderWidth: 0.75 });
    this.page.drawRectangle({ x: RAND, y: this.y - hoehe, width: 38, height: hoehe, color: FARBE_PRIMAER });
    const nr = String(nummer).padStart(2, "0");
    const nrBreite = this.schriftFett.widthOfTextAtSize(nr, 12);
    this.text(nr, RAND + 19 - nrBreite / 2, this.y - 23, { font: this.schriftFett, size: 12, color: FARBE_WEISS });
    this.text(titel, RAND + 50, this.y - 19, { font: this.schriftFett, size: GROESSE_ABSCHNITT, color: FARBE_PRIMAER });
    if (untertitel) this.text(untertitel, RAND + 50, this.y - 35, { size: GROESSE_LABEL, color: FARBE_GRAU });
    this.y -= hoehe + 10;
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

  /** Zwei kompakte Fotos je Zeile; Bild und Beschriftung bleiben stets zusammen. */
  async fotoRaster(titel: string, fotos: readonly PdfFoto[]): Promise<void> {
    if (fotos.length === 0) {
      this.abschnitt(titel);
      this.hinweis("Keine Fotos zu dieser Aufnahme.");
      return;
    }

    const eingebettet = await Promise.all(
      fotos.map(async (foto) => ({ ...foto, bild: await this.doc.embedJpg(foto.bytes) })),
    );
    const luecke = 14;
    const spaltenBreite = (INHALT_BREITE - luecke) / 2;
    const maxBildHoehe = 220;

    for (let i = 0; i < eingebettet.length; i += 2) {
      const zeile = eingebettet.slice(i, i + 2).map((foto) => {
        const skala = Math.min(spaltenBreite / foto.bild.width, maxBildHoehe / foto.bild.height);
        const breite = foto.bild.width * skala;
        const hoehe = foto.bild.height * skala;
        const beschriftung = foto.beschriftung
          ? umbrechen(foto.beschriftung, this.schrift, GROESSE_LABEL, spaltenBreite)
          : [];
        return { ...foto, breite, hoehe, beschriftung };
      });
      const zeilenHoehe = Math.max(
        ...zeile.map((foto) => foto.hoehe + (foto.beschriftung.length ? 8 + foto.beschriftung.length * 10 : 0)),
      ) + 12;

      if (i === 0) {
        this.sicherstellenPlatz(34 + zeilenHoehe);
        this.abschnitt(titel);
      } else {
        this.sicherstellenPlatz(zeilenHoehe);
      }

      zeile.forEach((foto, index) => {
        const spaltenX = RAND + index * (spaltenBreite + luecke);
        const x = spaltenX + (spaltenBreite - foto.breite) / 2;
        this.page.drawImage(foto.bild, {
          x,
          y: this.y - foto.hoehe,
          width: foto.breite,
          height: foto.hoehe,
        });
        let beschriftungY = this.y - foto.hoehe - 10;
        for (const text of foto.beschriftung) {
          this.text(text, spaltenX, beschriftungY, { size: GROESSE_LABEL, color: FARBE_GRAU });
          beschriftungY -= 10;
        }
      });
      this.y -= zeilenHoehe;
    }
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
    this.verknuepfeLinks();
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
