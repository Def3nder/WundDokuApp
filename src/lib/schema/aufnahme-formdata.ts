import { aufnahmeSchema, type AufnahmeEingabe } from "./aufnahme";
import { schreibeAuswahl } from "@/lib/utils";

/** Felder, die im Formular als Mehrfachauswahl auftreten. */
export const MEHRFACHFELDER = [
  "wundumgebung",
  "wundrand",
  "wundgrund",
  "exsudatFarben",
  "exsudatKonsistenz",
  "entzuendungszeichen",
  "lokaleInfektzeichen",
  "wundspuelung",
  "reinigung",
  "wundfuellung",
  "wundabdeckung",
  "fixierung",
  "kompression",
] as const;

/** Felder, die im Formular Ja/Nein sind. */
const JANEIN_FELDER = [
  "geruch",
  "systemischeZeichen",
  "abstrichGenommen",
  "schmerzen",
  "schmerzVerbandwechsel",
  "schmerzDruck",
  "schmerzUeberall",
  "schmerztagebuch",
  "wundeGeheilt",
] as const;

/** Alle einwertigen Felder des Formulars. */
const EINZELFELDER = [
  "datum",
  "wagnerArmstrongGrad",
  "dekubitusKategorie",
  "wundgrundSonstigesText",
  "breiteMm",
  "laengeMm",
  "tiefeMm",
  "exsudatMenge",
  "exsudatFarbeSonstiges",
  "infektionSonstiges",
  "abstrichErgebnis",
  "schmerzVas",
  "schmerzWundeModus",
  "schmerzWundeUhr",
  "schmerzWundrandModus",
  "schmerzWundrandUhr",
  "schmerzWundumgebungModus",
  "schmerzWundumgebungUhr",
  "schmerzVerbandwechselVas",
  "schmerzDruckVas",
  "schmerzUeberallVas",
  "schmerzSonstiges",
  "wundheilungsfaktoren",
  "wundspuelungSonstiges",
  "reinigungSonstiges",
  "hautpflege",
  "wundrandschutz",
  "wundfuellungGroesseCm",
  "wundfuellungSonstiges",
  "wundabdeckungGroesseCm",
  "wundabdeckungSonstiges",
  "fixierungSonstiges",
  "kompressionBinde1BreiteCm",
  "kompressionBinde1Anzahl",
  "kompressionBinde2BreiteCm",
  "kompressionBinde2Anzahl",
  "kompressionKlasse",
  "kompressionMass",
  "therapieSonstiges",
  "anmerkungen",
] as const;

/**
 * Baut aus den Formulardaten das Objekt fuer die Pruefung.
 *
 * Mehrfachauswahlen kommen als mehrere Eintraege mit demselben Namen an und
 * muessen mit getAll gelesen werden - get() liefert nur den ersten.
 */
export function aufnahmeAusFormData(fd: FormData) {
  const roh: Record<string, unknown> = {};

  for (const feld of EINZELFELDER) roh[feld] = fd.get(feld);
  for (const feld of MEHRFACHFELDER) roh[feld] = fd.getAll(feld);
  for (const feld of JANEIN_FELDER) {
    const v = fd.get(feld);
    roh[feld] = v === "on" || v === "true" || v === "ja";
  }

  return aufnahmeSchema.safeParse(roh);
}

/**
 * Bereinigt die geprueften Daten fuer die Ablage.
 *
 * Widersprueche werden hier aufgeloest statt im Formular: Wer "Schmerzen: nein"
 * setzt, nachdem er eine VAS eingetragen hatte, soll keine verwaisten Werte
 * in der Datenbank hinterlassen.
 */
export function aufnahmeZuDatensatz(d: AufnahmeEingabe) {
  const schmerzfrei = !d.schmerzen;

  return {
    datum: d.datum,
    wagnerArmstrongGrad: d.wagnerArmstrongGrad,
    dekubitusKategorie: d.dekubitusKategorie,

    wundumgebung: schreibeAuswahl(d.wundumgebung),
    wundrand: schreibeAuswahl(d.wundrand),
    wundgrund: schreibeAuswahl(d.wundgrund),
    wundgrundSonstigesText: d.wundgrund.includes("SONSTIGES")
      ? d.wundgrundSonstigesText
      : null,

    breiteMm: d.breiteMm,
    laengeMm: d.laengeMm,
    tiefeMm: d.tiefeMm,

    exsudatMenge: d.exsudatMenge,
    exsudatFarben: schreibeAuswahl(d.exsudatFarben),
    exsudatFarbeSonstiges: d.exsudatFarben.includes("SONSTIGES")
      ? d.exsudatFarbeSonstiges
      : null,
    exsudatKonsistenz: schreibeAuswahl(d.exsudatKonsistenz),

    geruch: d.geruch,

    entzuendungszeichen: schreibeAuswahl(d.entzuendungszeichen),
    lokaleInfektzeichen: schreibeAuswahl(d.lokaleInfektzeichen),
    systemischeZeichen: d.systemischeZeichen,
    infektionSonstiges: d.infektionSonstiges,

    abstrichGenommen: d.abstrichGenommen,
    abstrichErgebnis: d.abstrichGenommen ? d.abstrichErgebnis : null,

    schmerzen: d.schmerzen,
    schmerzVas: schmerzfrei ? null : d.schmerzVas,
    schmerzWundeModus: schmerzfrei ? null : d.schmerzWundeModus,
    schmerzWundeUhr:
      schmerzfrei || d.schmerzWundeModus !== "UHR" ? null : d.schmerzWundeUhr,
    schmerzWundrandModus: schmerzfrei ? null : d.schmerzWundrandModus,
    schmerzWundrandUhr:
      schmerzfrei || d.schmerzWundrandModus !== "UHR" ? null : d.schmerzWundrandUhr,
    schmerzWundumgebungModus: schmerzfrei ? null : d.schmerzWundumgebungModus,
    schmerzWundumgebungUhr:
      schmerzfrei || d.schmerzWundumgebungModus !== "UHR"
        ? null
        : d.schmerzWundumgebungUhr,
    schmerzVerbandwechsel: d.schmerzVerbandwechsel,
    schmerzVerbandwechselVas: d.schmerzVerbandwechsel ? d.schmerzVerbandwechselVas : null,
    schmerzDruck: d.schmerzDruck,
    schmerzDruckVas: d.schmerzDruck ? d.schmerzDruckVas : null,
    schmerzUeberall: d.schmerzUeberall,
    schmerzUeberallVas: d.schmerzUeberall ? d.schmerzUeberallVas : null,
    schmerztagebuch: d.schmerztagebuch,
    schmerzSonstiges: d.schmerzSonstiges,

    wundheilungsfaktoren: d.wundheilungsfaktoren,

    wundspuelung: schreibeAuswahl(d.wundspuelung),
    wundspuelungSonstiges: d.wundspuelungSonstiges,
    reinigung: schreibeAuswahl(d.reinigung),
    reinigungSonstiges: d.reinigungSonstiges,
    hautpflege: d.hautpflege,
    wundrandschutz: d.wundrandschutz,

    wundfuellung: schreibeAuswahl(d.wundfuellung),
    wundfuellungGroesseCm: d.wundfuellungGroesseCm,
    wundfuellungSonstiges: d.wundfuellungSonstiges,

    wundabdeckung: schreibeAuswahl(d.wundabdeckung),
    wundabdeckungGroesseCm: d.wundabdeckungGroesseCm,
    wundabdeckungSonstiges: d.wundabdeckungSonstiges,

    fixierung: schreibeAuswahl(d.fixierung),
    fixierungSonstiges: d.fixierungSonstiges,

    kompression: schreibeAuswahl(d.kompression),
    kompressionBinde1BreiteCm: d.kompressionBinde1BreiteCm,
    kompressionBinde1Anzahl: d.kompressionBinde1Anzahl,
    kompressionBinde2BreiteCm: d.kompressionBinde2BreiteCm,
    kompressionBinde2Anzahl: d.kompressionBinde2Anzahl,
    kompressionKlasse: d.kompressionKlasse,
    kompressionMass: d.kompressionMass,

    therapieSonstiges: d.therapieSonstiges,
    anmerkungen: d.anmerkungen,

    wundeGeheilt: d.wundeGeheilt,
  };
}
