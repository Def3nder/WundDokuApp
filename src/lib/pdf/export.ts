/**
 * Erzeugt PDF-Ausdrucke einer einzelnen Aufnahme oder des gesamten Verlaufs
 * einer Wunde.
 *
 * Zeigt bewusst dieselben Felder in derselben Reihenfolge wie die
 * Leseansicht (`aufnahmen/[id]/page.tsx`) - Bildschirm und Ausdruck sollen
 * nie auseinanderlaufen. Das Layout ist eigenstaendig (`pdf/builder.ts`),
 * keine Kopie des DRACO-Papierbogens.
 */
import { readFile } from "node:fs/promises";
import type { Assessment, Patient, Photo, Wound } from "@prisma/client";
import sharp from "sharp";
import { db } from "@/lib/db";
import { absoluterFotoPfad } from "@/lib/fotos";
import { leseAuswahl } from "@/lib/utils";
import { beschreibeDauer, beschreibeLokalisation, beschreibeRezidiv, datum } from "@/lib/wundtext";
import { flaecheMm2, formatiereMm2, formatiereProzent, flaechenTrend } from "@/lib/wundmasse";
import {
  AUFNAHME_TYPEN,
  DEKUBITUS_KATEGORIEN,
  DIAGNOSE_TYPEN,
  ENTZUENDUNGSZEICHEN,
  EXSUDAT_FARBEN,
  EXSUDAT_KONSISTENZ,
  EXSUDAT_MENGEN,
  FIXIERUNG,
  KOMPRESSION,
  KOMPRESSIONSKLASSEN,
  LOKALE_INFEKTZEICHEN,
  REINIGUNG,
  SCHMERZ_ORT_MODI,
  WAGNER_GRADE,
  WUNDABDECKUNG,
  WUNDFUELLUNG,
  WUNDGRUND,
  WUNDRAND,
  WUNDSPUELUNG,
  WUNDUMGEBUNG,
  labelVon,
  labelsVon,
} from "@/lib/enums";
import { PdfBuilder, type Angabe } from "@/lib/pdf/builder";

export class PdfExportFehler extends Error {}

type AufnahmeMitFotos = Assessment & {
  fotos: Photo[];
  erstelltVon: { name: string; handzeichen: string } | null;
};

const jaNein = (wert: boolean) => (wert ? "Ja" : "Nein");
const nummer = (wert: number | null, einheit = "") =>
  wert == null ? "" : `${new Intl.NumberFormat("de-DE").format(wert)}${einheit}`;
const liste = (optionen: readonly { wert: string; label: string }[], json: string) =>
  labelsVon(optionen, leseAuswahl(json)).join(", ");
const schmerzOrt = (modus: string | null, uhr: number | null) =>
  modus === "UHR" && uhr ? `Auf ${uhr} Uhr` : labelVon(SCHMERZ_ORT_MODI, modus);

/** Entfernt Umlaute und Sonderzeichen fuer einen unbedenklichen Dateinamen. */
function dateiSicher(text: string): string {
  return text
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pdfDateiname(patient: Patient, wunde: Wound, aufnahmeDatum?: Date): string {
  const teile = [
    "Wunddokumentation",
    dateiSicher(`${patient.nachname}-${patient.vorname}`),
    dateiSicher(wunde.bezeichnung),
    aufnahmeDatum ? datum(aufnahmeDatum).replaceAll(".", "-") : "Verlauf",
  ];
  return `${teile.filter(Boolean).join("_")}.pdf`;
}

/** Liest ein gespeichertes Foto (WebP) und kodiert es fuer `pdf-lib` nach JPEG um. */
async function fotoAlsJpeg(pfad: string): Promise<Uint8Array> {
  const original = await readFile(absoluterFotoPfad(pfad));
  return sharp(original).jpeg({ quality: 85 }).toBuffer();
}

function kopfzeilen(patient: Patient, wunde: Wound): string[] {
  return [
    `${patient.nachname}, ${patient.vorname} · geb. ${datum(patient.geburtsdatum)} · Pat.-Nr. ${patient.patientennummer}`,
    `${wunde.bezeichnung} · ${labelVon(DIAGNOSE_TYPEN, wunde.diagnoseTyp)}`,
  ];
}

function renderWundangaben(builder: PdfBuilder, wunde: Wound): void {
  const lokalisation = beschreibeLokalisation(wunde);
  const dauer = beschreibeDauer(wunde);
  const rezidiv = beschreibeRezidiv(wunde);
  const angaben: Angabe[] = [
    ["Lokalisation", lokalisation],
    ["Besteht seit", dauer],
    ["Rezidiv", rezidiv],
  ];
  builder.angaben(angaben);
  if (wunde.diagnoseFreitext) builder.absatz(wunde.diagnoseFreitext);
}

async function renderAufnahme(
  builder: PdfBuilder,
  aufnahme: AufnahmeMitFotos,
  vorherigeFlaeche: number | null,
): Promise<void> {
  const flaeche = flaecheMm2(aufnahme);
  const trend = flaechenTrend(flaeche, vorherigeFlaeche);
  const trendText = trend
    ? trend.richtung === "unveraendert"
      ? "unverändert"
      : `${formatiereProzent(trend.prozent)} (${trend.richtung === "verkleinert" ? "Verkleinerung" : "Vergrößerung"})`
    : "";

  const kompressionTeile = [
    aufnahme.kompressionBinde1BreiteCm != null || aufnahme.kompressionBinde1Anzahl != null
      ? `Binde 1: ${nummer(aufnahme.kompressionBinde1BreiteCm, " cm") || "–"}, ${aufnahme.kompressionBinde1Anzahl ?? "–"} Stück`
      : "",
    aufnahme.kompressionBinde2BreiteCm != null || aufnahme.kompressionBinde2Anzahl != null
      ? `Binde 2: ${nummer(aufnahme.kompressionBinde2BreiteCm, " cm") || "–"}, ${aufnahme.kompressionBinde2Anzahl ?? "–"} Stück`
      : "",
    labelVon(KOMPRESSIONSKLASSEN, aufnahme.kompressionKlasse),
    aufnahme.kompressionMass,
  ].filter(Boolean).join(", ");

  builder.abschnitt("Wundbefund");
  builder.angaben([
    ["Wagner-/Armstrong-Grad", labelVon(WAGNER_GRADE, aufnahme.wagnerArmstrongGrad)],
    ["Dekubitus-Kategorie", labelVon(DEKUBITUS_KATEGORIEN, aufnahme.dekubitusKategorie)],
    ["Wundumgebung", liste(WUNDUMGEBUNG, aufnahme.wundumgebung)],
    ["Wundrand", liste(WUNDRAND, aufnahme.wundrand)],
    ["Wundgrund", liste(WUNDGRUND, aufnahme.wundgrund)],
    ["Sonstiger Wundgrund", aufnahme.wundgrundSonstigesText],
  ]);

  builder.abschnitt("Wundgröße & Exsudation");
  builder.angaben([
    ["Breite", nummer(aufnahme.breiteMm, " mm")],
    ["Länge", nummer(aufnahme.laengeMm, " mm")],
    ["Tiefe", nummer(aufnahme.tiefeMm, " mm")],
    ["Fläche", formatiereMm2(flaeche)],
    ["Veränderung zur Vorherigen", trendText],
    ["Exsudatmenge", labelVon(EXSUDAT_MENGEN, aufnahme.exsudatMenge)],
    ["Exsudatfarbe", liste(EXSUDAT_FARBEN, aufnahme.exsudatFarben)],
    ["Sonstige Farbe", aufnahme.exsudatFarbeSonstiges],
    ["Konsistenz", liste(EXSUDAT_KONSISTENZ, aufnahme.exsudatKonsistenz)],
    ["Geruch", jaNein(aufnahme.geruch)],
  ]);

  builder.abschnitt("Entzündung & Infektion");
  builder.angaben([
    ["Entzündungszeichen", liste(ENTZUENDUNGSZEICHEN, aufnahme.entzuendungszeichen)],
    ["Lokale Infektzeichen", liste(LOKALE_INFEKTZEICHEN, aufnahme.lokaleInfektzeichen)],
    ["Systemische Zeichen", jaNein(aufnahme.systemischeZeichen)],
    ["Weitere Beobachtungen", aufnahme.infektionSonstiges],
    ["Abstrich genommen", jaNein(aufnahme.abstrichGenommen)],
    ["Abstrichergebnis", aufnahme.abstrichErgebnis],
  ]);

  builder.abschnitt("Schmerz & Heilungsfaktoren");
  builder.angaben([
    ["Schmerzen", jaNein(aufnahme.schmerzen)],
    ["Aktuelle Stärke", aufnahme.schmerzen && aufnahme.schmerzVas != null ? `VAS/NRS ${aufnahme.schmerzVas}/10` : ""],
    ["In der Wunde", schmerzOrt(aufnahme.schmerzWundeModus, aufnahme.schmerzWundeUhr)],
    ["Am Wundrand", schmerzOrt(aufnahme.schmerzWundrandModus, aufnahme.schmerzWundrandUhr)],
    ["Wundumgebung", schmerzOrt(aufnahme.schmerzWundumgebungModus, aufnahme.schmerzWundumgebungUhr)],
    ["Beim Verbandwechsel", aufnahme.schmerzVerbandwechsel ? `Ja${aufnahme.schmerzVerbandwechselVas != null ? `, VAS ${aufnahme.schmerzVerbandwechselVas}/10` : ""}` : "Nein"],
    ["Bei Druck", aufnahme.schmerzDruck ? `Ja${aufnahme.schmerzDruckVas != null ? `, VAS ${aufnahme.schmerzDruckVas}/10` : ""}` : "Nein"],
    ["Überall im Wundbereich", aufnahme.schmerzUeberall ? `Ja${aufnahme.schmerzUeberallVas != null ? `, VAS ${aufnahme.schmerzUeberallVas}/10` : ""}` : "Nein"],
    ["Schmerztagebuch", jaNein(aufnahme.schmerztagebuch)],
    ["Weitere Schmerzangaben", aufnahme.schmerzSonstiges],
    ["Wundheilungsfaktoren", aufnahme.wundheilungsfaktoren],
  ]);

  builder.abschnitt("Therapieplan");
  builder.angaben([
    ["Wundspülung", [liste(WUNDSPUELUNG, aufnahme.wundspuelung), aufnahme.wundspuelungSonstiges].filter(Boolean).join(", ")],
    ["Reinigung", [liste(REINIGUNG, aufnahme.reinigung), aufnahme.reinigungSonstiges].filter(Boolean).join(", ")],
    ["Hautpflege", aufnahme.hautpflege],
    ["Wundrandschutz", aufnahme.wundrandschutz],
    ["Wundfüllung", [liste(WUNDFUELLUNG, aufnahme.wundfuellung), nummer(aufnahme.wundfuellungGroesseCm, " cm"), aufnahme.wundfuellungSonstiges].filter(Boolean).join(", ")],
    ["Wundabdeckung", [liste(WUNDABDECKUNG, aufnahme.wundabdeckung), nummer(aufnahme.wundabdeckungGroesseCm, " cm"), aufnahme.wundabdeckungSonstiges].filter(Boolean).join(", ")],
    ["Fixierung", [liste(FIXIERUNG, aufnahme.fixierung), aufnahme.fixierungSonstiges].filter(Boolean).join(", ")],
    ["Kompression", [liste(KOMPRESSION, aufnahme.kompression), kompressionTeile].filter(Boolean).join(", ")],
    ["Weitere Therapieangaben", aufnahme.therapieSonstiges],
    ["Allgemeine Anmerkungen", aufnahme.anmerkungen],
  ]);

  builder.abschnitt(`Fotos${aufnahme.fotos.length > 0 ? ` (${aufnahme.fotos.length})` : ""}`);
  if (aufnahme.fotos.length === 0) {
    builder.hinweis("Keine Fotos zu dieser Aufnahme.");
  } else {
    for (const foto of aufnahme.fotos) {
      const jpeg = await fotoAlsJpeg(foto.pfad);
      const beschriftung = [datum(foto.aufgenommenAm), foto.beschreibung].filter(Boolean).join(" · ");
      await builder.foto(jpeg, beschriftung);
    }
  }
}

function pruefeAufnahmeSichtbar(aufnahme: { geloeschtAm: Date | null }, wunde: Wound, patient: Patient): void {
  if (aufnahme.geloeschtAm || wunde.geloeschtAm || patient.geloeschtAm) {
    throw new PdfExportFehler("Aufnahme nicht gefunden");
  }
}

/** Baut das PDF fuer genau eine Aufnahme. */
export async function erzeugeAufnahmePdf(
  assessmentId: string,
): Promise<{ bytes: Uint8Array; dateiname: string }> {
  const aufnahme = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      wunde: { include: { patient: true } },
      erstelltVon: { select: { name: true, handzeichen: true } },
      fotos: { where: { geloeschtAm: null }, orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!aufnahme) throw new PdfExportFehler("Aufnahme nicht gefunden");
  pruefeAufnahmeSichtbar(aufnahme, aufnahme.wunde, aufnahme.wunde.patient);

  const vorherige = await db.assessment.findFirst({
    where: {
      woundId: aufnahme.woundId,
      geloeschtAm: null,
      istEntwurf: false,
      datum: { lt: aufnahme.datum },
    },
    orderBy: { datum: "desc" },
    select: { breiteMm: true, laengeMm: true, tiefeMm: true },
  });

  const builder = await PdfBuilder.erstellen();
  const typLabel = labelVon(AUFNAHME_TYPEN, aufnahme.typ) + (aufnahme.istEntwurf ? " · Entwurf" : "");
  builder.kopf(`Aufnahme vom ${datum(aufnahme.datum)}`, [
    typLabel,
    ...kopfzeilen(aufnahme.wunde.patient, aufnahme.wunde),
    aufnahme.erstelltVon ? `Dokumentiert von ${aufnahme.erstelltVon.name} (${aufnahme.erstelltVon.handzeichen})` : "",
  ]);
  renderWundangaben(builder, aufnahme.wunde);
  await renderAufnahme(builder, aufnahme, vorherige ? flaecheMm2(vorherige) : null);

  const bytes = await builder.fertig();
  return { bytes, dateiname: pdfDateiname(aufnahme.wunde.patient, aufnahme.wunde, aufnahme.datum) };
}

/** Baut ein mehrseitiges PDF mit allen abgeschlossenen Aufnahmen einer Wunde. */
export async function erzeugeVerlaufPdf(
  woundId: string,
): Promise<{ bytes: Uint8Array; dateiname: string; anzahlAufnahmen: number }> {
  const wunde = await db.wound.findUnique({
    where: { id: woundId },
    include: {
      patient: true,
      aufnahmen: {
        where: { geloeschtAm: null, istEntwurf: false },
        orderBy: { datum: "asc" },
        include: {
          erstelltVon: { select: { name: true, handzeichen: true } },
          fotos: { where: { geloeschtAm: null }, orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  });
  if (!wunde || wunde.geloeschtAm || wunde.patient.geloeschtAm) {
    throw new PdfExportFehler("Wunde nicht gefunden");
  }
  if (wunde.aufnahmen.length === 0) {
    throw new PdfExportFehler("Keine abgeschlossenen Aufnahmen vorhanden");
  }

  const builder = await PdfBuilder.erstellen();
  builder.kopf(`Wundverlauf: ${wunde.bezeichnung}`, [
    `${wunde.aufnahmen.length} Aufnahmen · ${datum(wunde.aufnahmen[0].datum)} bis ${datum(wunde.aufnahmen.at(-1)!.datum)}`,
    ...kopfzeilen(wunde.patient, wunde),
  ]);
  renderWundangaben(builder, wunde);

  builder.abschnitt("Übersicht");
  builder.tabelle(
    [
      { titel: "Datum", breite: 90 },
      { titel: "Typ", breite: 110 },
      { titel: "Fläche", breite: 90 },
      { titel: "Handzeichen", breite: 90 },
    ],
    wunde.aufnahmen.map((a) => [
      datum(a.datum),
      labelVon(AUFNAHME_TYPEN, a.typ),
      formatiereMm2(flaecheMm2(a)),
      a.erstelltVon?.handzeichen ?? "–",
    ]),
  );

  let vorherigeFlaeche: number | null = null;
  for (const aufnahme of wunde.aufnahmen) {
    builder.seitenumbruch();
    builder.kopf(`Aufnahme vom ${datum(aufnahme.datum)}`, [
      labelVon(AUFNAHME_TYPEN, aufnahme.typ),
      aufnahme.erstelltVon ? `Dokumentiert von ${aufnahme.erstelltVon.name} (${aufnahme.erstelltVon.handzeichen})` : "",
    ]);
    await renderAufnahme(builder, aufnahme, vorherigeFlaeche);
    vorherigeFlaeche = flaecheMm2(aufnahme);
  }

  const bytes = await builder.fertig();
  return {
    bytes,
    dateiname: pdfDateiname(wunde.patient, wunde),
    anzahlAufnahmen: wunde.aufnahmen.length,
  };
}
