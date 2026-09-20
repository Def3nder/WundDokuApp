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
import { baueVerlaufspunkte, diagrammDatumKurz } from "@/lib/auswertung";
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
  WUNDGRUND_GRUPPEN,
  WUNDRAND,
  WUNDSPUELUNG,
  WUNDUMGEBUNG,
  labelVon,
  labelsVon,
} from "@/lib/enums";
import { PdfBuilder, PDF_DIAGRAMM_FARBEN, type Angabe } from "@/lib/pdf/builder";

/** Dieselbe Farbstaffelung wie `gruppenFarben` in verlaufsdiagramme.tsx. */
const WUNDGRUND_GRUPPEN_FARBEN = [1, 0, 2, 4, 3].map((index) => PDF_DIAGRAMM_FARBEN[index]);

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

function patientenname(patient: Patient): string {
  return `${patient.nachname}, ${patient.vorname}`;
}

function patientenMetadaten(patient: Patient, wunde: Wound): string[] {
  return [
    `Geboren: ${datum(patient.geburtsdatum)} · Pat.-Nr. ${patient.patientennummer}`,
    labelVon(DIAGNOSE_TYPEN, wunde.diagnoseTyp),
  ];
}

function aufnahmeTitel(typ: string, aufnahmeDatum: Date): string {
  return `${typ === "ERSTAUFNAHME" ? "Aufnahme" : "Folgeaufnahme"} vom ${datum(aufnahmeDatum)}`;
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

  builder.angabenBlock("Wundbefund", [
    ["Wagner-/Armstrong-Grad", labelVon(WAGNER_GRADE, aufnahme.wagnerArmstrongGrad)],
    ["Dekubitus-Kategorie", labelVon(DEKUBITUS_KATEGORIEN, aufnahme.dekubitusKategorie)],
    ["Wundumgebung", liste(WUNDUMGEBUNG, aufnahme.wundumgebung)],
    ["Wundrand", liste(WUNDRAND, aufnahme.wundrand)],
    ["Wundgrund", liste(WUNDGRUND, aufnahme.wundgrund)],
    ["Sonstiger Wundgrund", aufnahme.wundgrundSonstigesText],
  ]);

  builder.angabenBlock("Wundgröße & Exsudation", [
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

  builder.angabenBlock("Entzündung & Infektion", [
    ["Entzündungszeichen", liste(ENTZUENDUNGSZEICHEN, aufnahme.entzuendungszeichen)],
    ["Lokale Infektzeichen", liste(LOKALE_INFEKTZEICHEN, aufnahme.lokaleInfektzeichen)],
    ["Systemische Zeichen", jaNein(aufnahme.systemischeZeichen)],
    ["Weitere Beobachtungen", aufnahme.infektionSonstiges],
    ["Abstrich genommen", jaNein(aufnahme.abstrichGenommen)],
    ["Abstrichergebnis", aufnahme.abstrichErgebnis],
  ]);

  builder.angabenBlock("Schmerz & Heilungsfaktoren", [
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

  builder.angabenBlock("Therapieplan", [
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

  const fotos = await Promise.all(
    aufnahme.fotos.map(async (foto) => ({
      bytes: await fotoAlsJpeg(foto.pfad),
      beschriftung: [datum(foto.aufgenommenAm), foto.beschreibung].filter(Boolean).join(" · "),
    })),
  );
  await builder.fotoRaster(`Fotos${fotos.length > 0 ? ` (${fotos.length})` : ""}`, fotos);
}

/** PDF-Verlaufsdiagramme; die klassische Abmessungs-Liniengrafik bleibt hier bewusst erhalten. */
function renderVerlaufsdiagramme(builder: PdfBuilder, aufnahmen: readonly Assessment[]): void {
  const punkte = baueVerlaufspunkte(aufnahmen);
  const xLabels = punkte.map((p) => diagrammDatumKurz(p.datum));
  const [chart1, chart2, chart3, chart4, chart5] = PDF_DIAGRAMM_FARBEN;

  builder.liniendiagramm(
    "Wundfläche",
    "Breite × Länge in mm² – kleinere Werte bedeuten Heilungsfortschritt.",
    xLabels,
    [{ name: "Fläche", farbe: chart1, werte: punkte.map((p) => p.flaeche), flaeche: true }],
  );

  builder.liniendiagramm(
    "Abmessungen",
    "Breite, Länge und Tiefe in Millimetern.",
    xLabels,
    [
      { name: "Breite", farbe: chart1, werte: punkte.map((p) => p.breiteMm) },
      { name: "Länge", farbe: chart2, werte: punkte.map((p) => p.laengeMm), gestrichelt: true },
      { name: "Tiefe", farbe: chart4, werte: punkte.map((p) => p.tiefeMm), gestrichelt: true },
    ],
  );

  builder.liniendiagramm(
    "Schmerz & Exsudation",
    "VAS 0–10 und Exsudatstufe 0–3 auf getrennten Achsen.",
    xLabels,
    [
      { name: "Schmerz-VAS", farbe: chart5, werte: punkte.map((p) => p.schmerzVas), domain: [0, 10] },
      { name: "Exsudat", farbe: chart3, werte: punkte.map((p) => p.exsudatStufe), domain: [0, 3], gestrichelt: true },
    ],
  );

  builder.gestapeltesBalkendiagramm(
    "Wundgrund-Zusammensetzung",
    "Dokumentierte Befunde, gebündelt in fünf klinische Gruppen.",
    xLabels,
    WUNDGRUND_GRUPPEN.map((gruppe, index) => ({
      name: gruppe.label,
      farbe: WUNDGRUND_GRUPPEN_FARBEN[index],
      werte: punkte.map((p) => p.wundgrund[gruppe.id]),
    })),
  );
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
  builder.aufnahmeKopf({
    aufnahme: aufnahmeTitel(aufnahme.typ, aufnahme.datum),
    befund: aufnahme.wunde.bezeichnung,
    linksUnten: [typLabel, aufnahme.erstelltVon ? `Handzeichen: ${aufnahme.erstelltVon.handzeichen}` : ""].filter(Boolean).join(" · "),
    patient: patientenname(aufnahme.wunde.patient),
    patientMeta: patientenMetadaten(aufnahme.wunde.patient, aufnahme.wunde),
  });
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
  builder.aufnahmeKopf({
    aufnahme: "Wundverlauf",
    befund: wunde.bezeichnung,
    linksUnten: `${wunde.aufnahmen.length} Aufnahmen · ${datum(wunde.aufnahmen[0].datum)} bis ${datum(wunde.aufnahmen.at(-1)!.datum)}`,
    patient: patientenname(wunde.patient),
    patientMeta: patientenMetadaten(wunde.patient, wunde),
  });
  renderWundangaben(builder, wunde);

  let uebersichtVorherigeFlaeche: number | null = null;
  builder.verlaufsUebersicht(wunde.aufnahmen.map((a, index) => {
    const flaeche = flaecheMm2(a);
    const trend = flaechenTrend(flaeche, uebersichtVorherigeFlaeche);
    uebersichtVorherigeFlaeche = flaeche;
    return {
      nummer: index + 1,
      datum: datum(a.datum),
      typ: labelVon(AUFNAHME_TYPEN, a.typ),
      flaeche: formatiereMm2(flaeche),
      trend: trend ? formatiereProzent(trend.prozent) : "",
      fotos: a.fotos.length,
    };
  }));

  renderVerlaufsdiagramme(builder, wunde.aufnahmen);

  let vorherigeFlaeche: number | null = null;
  for (const [index, aufnahme] of wunde.aufnahmen.entries()) {
    const typUndDatum = aufnahmeTitel(aufnahme.typ, aufnahme.datum);
    const dokumentiertVon = aufnahme.erstelltVon
      ? `Dokumentiert von ${aufnahme.erstelltVon.name} (${aufnahme.erstelltVon.handzeichen})`
      : "";

    if (index === 0 && builder.hatPlatz(250)) {
      builder.aufnahmeBanner(index + 1, typUndDatum, dokumentiertVon);
    } else {
      builder.seitenumbruch();
      builder.aufnahmeKopf({
        aufnahme: typUndDatum,
        befund: wunde.bezeichnung,
        linksUnten: dokumentiertVon,
        patient: patientenname(wunde.patient),
        patientMeta: patientenMetadaten(wunde.patient, wunde),
      });
      builder.aufnahmeBanner(index + 1, typUndDatum, dokumentiertVon);
    }
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
