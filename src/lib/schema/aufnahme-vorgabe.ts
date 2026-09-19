import type { Assessment } from "@prisma/client";
import { leseAuswahl } from "@/lib/utils";

export type AufnahmeWerte = {
  datum: string;
  wagnerArmstrongGrad: string;
  dekubitusKategorie: string;
  wundumgebung: string[];
  wundrand: string[];
  wundgrund: string[];
  wundgrundSonstigesText: string;
  breiteMm: string;
  laengeMm: string;
  tiefeMm: string;
  exsudatMenge: string;
  exsudatFarben: string[];
  exsudatFarbeSonstiges: string;
  exsudatKonsistenz: string[];
  geruch: boolean;
  entzuendungszeichen: string[];
  lokaleInfektzeichen: string[];
  systemischeZeichen: boolean;
  infektionSonstiges: string;
  abstrichGenommen: boolean;
  abstrichErgebnis: string;
  schmerzen: boolean;
  schmerzVas: number | null;
  schmerzWundeModus: string;
  schmerzWundeUhr: number | null;
  schmerzWundrandModus: string;
  schmerzWundrandUhr: number | null;
  schmerzWundumgebungModus: string;
  schmerzWundumgebungUhr: number | null;
  schmerzVerbandwechsel: boolean;
  schmerzVerbandwechselVas: number | null;
  schmerzDruck: boolean;
  schmerzDruckVas: number | null;
  schmerzUeberall: boolean;
  schmerzUeberallVas: number | null;
  schmerztagebuch: boolean;
  schmerzSonstiges: string;
  wundheilungsfaktoren: string;
  wundspuelung: string[];
  wundspuelungSonstiges: string;
  reinigung: string[];
  reinigungSonstiges: string;
  hautpflege: string;
  wundrandschutz: string;
  wundfuellung: string[];
  wundfuellungGroesseCm: string;
  wundfuellungSonstiges: string;
  wundabdeckung: string[];
  wundabdeckungGroesseCm: string;
  wundabdeckungSonstiges: string;
  fixierung: string[];
  fixierungSonstiges: string;
  kompression: string[];
  kompressionBinde1BreiteCm: string;
  kompressionBinde1Anzahl: string;
  kompressionBinde2BreiteCm: string;
  kompressionBinde2Anzahl: string;
  kompressionKlasse: string;
  kompressionMass: string;
  therapieSonstiges: string;
  anmerkungen: string;
};

function datumFuerEingabe(datum: Date): string {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  const tag = String(datum.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

const text = (wert: string | null) => wert ?? "";
const zahl = (wert: number | null) => wert?.toString() ?? "";

export function leereAufnahmeWerte(datum = new Date()): AufnahmeWerte {
  return {
    datum: datumFuerEingabe(datum),
    wagnerArmstrongGrad: "",
    dekubitusKategorie: "",
    wundumgebung: [],
    wundrand: [],
    wundgrund: [],
    wundgrundSonstigesText: "",
    breiteMm: "",
    laengeMm: "",
    tiefeMm: "",
    exsudatMenge: "",
    exsudatFarben: [],
    exsudatFarbeSonstiges: "",
    exsudatKonsistenz: [],
    geruch: false,
    entzuendungszeichen: [],
    lokaleInfektzeichen: [],
    systemischeZeichen: false,
    infektionSonstiges: "",
    abstrichGenommen: false,
    abstrichErgebnis: "",
    schmerzen: false,
    schmerzVas: null,
    schmerzWundeModus: "",
    schmerzWundeUhr: null,
    schmerzWundrandModus: "",
    schmerzWundrandUhr: null,
    schmerzWundumgebungModus: "",
    schmerzWundumgebungUhr: null,
    schmerzVerbandwechsel: false,
    schmerzVerbandwechselVas: null,
    schmerzDruck: false,
    schmerzDruckVas: null,
    schmerzUeberall: false,
    schmerzUeberallVas: null,
    schmerztagebuch: false,
    schmerzSonstiges: "",
    wundheilungsfaktoren: "",
    wundspuelung: [],
    wundspuelungSonstiges: "",
    reinigung: [],
    reinigungSonstiges: "",
    hautpflege: "",
    wundrandschutz: "",
    wundfuellung: [],
    wundfuellungGroesseCm: "",
    wundfuellungSonstiges: "",
    wundabdeckung: [],
    wundabdeckungGroesseCm: "",
    wundabdeckungSonstiges: "",
    fixierung: [],
    fixierungSonstiges: "",
    kompression: [],
    kompressionBinde1BreiteCm: "",
    kompressionBinde1Anzahl: "",
    kompressionBinde2BreiteCm: "",
    kompressionBinde2Anzahl: "",
    kompressionKlasse: "",
    kompressionMass: "",
    therapieSonstiges: "",
    anmerkungen: "",
  };
}

/** Wandelt den gespeicherten Datensatz verlustfrei in HTML-Formularwerte um. */
export function aufnahmeZuWerten(a: Assessment): AufnahmeWerte {
  return {
    datum: datumFuerEingabe(a.datum),
    wagnerArmstrongGrad: text(a.wagnerArmstrongGrad),
    dekubitusKategorie: text(a.dekubitusKategorie),
    wundumgebung: leseAuswahl(a.wundumgebung),
    wundrand: leseAuswahl(a.wundrand),
    wundgrund: leseAuswahl(a.wundgrund),
    wundgrundSonstigesText: text(a.wundgrundSonstigesText),
    breiteMm: zahl(a.breiteMm),
    laengeMm: zahl(a.laengeMm),
    tiefeMm: zahl(a.tiefeMm),
    exsudatMenge: text(a.exsudatMenge),
    exsudatFarben: leseAuswahl(a.exsudatFarben),
    exsudatFarbeSonstiges: text(a.exsudatFarbeSonstiges),
    exsudatKonsistenz: leseAuswahl(a.exsudatKonsistenz),
    geruch: a.geruch,
    entzuendungszeichen: leseAuswahl(a.entzuendungszeichen),
    lokaleInfektzeichen: leseAuswahl(a.lokaleInfektzeichen),
    systemischeZeichen: a.systemischeZeichen,
    infektionSonstiges: text(a.infektionSonstiges),
    abstrichGenommen: a.abstrichGenommen,
    abstrichErgebnis: text(a.abstrichErgebnis),
    schmerzen: a.schmerzen,
    schmerzVas: a.schmerzVas,
    schmerzWundeModus: text(a.schmerzWundeModus),
    schmerzWundeUhr: a.schmerzWundeUhr,
    schmerzWundrandModus: text(a.schmerzWundrandModus),
    schmerzWundrandUhr: a.schmerzWundrandUhr,
    schmerzWundumgebungModus: text(a.schmerzWundumgebungModus),
    schmerzWundumgebungUhr: a.schmerzWundumgebungUhr,
    schmerzVerbandwechsel: a.schmerzVerbandwechsel,
    schmerzVerbandwechselVas: a.schmerzVerbandwechselVas,
    schmerzDruck: a.schmerzDruck,
    schmerzDruckVas: a.schmerzDruckVas,
    schmerzUeberall: a.schmerzUeberall,
    schmerzUeberallVas: a.schmerzUeberallVas,
    schmerztagebuch: a.schmerztagebuch,
    schmerzSonstiges: text(a.schmerzSonstiges),
    wundheilungsfaktoren: text(a.wundheilungsfaktoren),
    wundspuelung: leseAuswahl(a.wundspuelung),
    wundspuelungSonstiges: text(a.wundspuelungSonstiges),
    reinigung: leseAuswahl(a.reinigung),
    reinigungSonstiges: text(a.reinigungSonstiges),
    hautpflege: text(a.hautpflege),
    wundrandschutz: text(a.wundrandschutz),
    wundfuellung: leseAuswahl(a.wundfuellung),
    wundfuellungGroesseCm: zahl(a.wundfuellungGroesseCm),
    wundfuellungSonstiges: text(a.wundfuellungSonstiges),
    wundabdeckung: leseAuswahl(a.wundabdeckung),
    wundabdeckungGroesseCm: zahl(a.wundabdeckungGroesseCm),
    wundabdeckungSonstiges: text(a.wundabdeckungSonstiges),
    fixierung: leseAuswahl(a.fixierung),
    fixierungSonstiges: text(a.fixierungSonstiges),
    kompression: leseAuswahl(a.kompression),
    kompressionBinde1BreiteCm: zahl(a.kompressionBinde1BreiteCm),
    kompressionBinde1Anzahl: zahl(a.kompressionBinde1Anzahl),
    kompressionBinde2BreiteCm: zahl(a.kompressionBinde2BreiteCm),
    kompressionBinde2Anzahl: zahl(a.kompressionBinde2Anzahl),
    kompressionKlasse: text(a.kompressionKlasse),
    kompressionMass: text(a.kompressionMass),
    therapieSonstiges: text(a.therapieSonstiges),
    anmerkungen: text(a.anmerkungen),
  };
}

/**
 * Übernimmt die letzte Aufnahme als Arbeitsgrundlage einer Folgeaufnahme.
 * Maße bleiben absichtlich leer: Sie müssen bei jedem Verbandwechsel neu
 * gemessen werden, damit keine alten Werte die Verlaufskurve verfälschen.
 */
export function vorbefuellungAus(letzte: Assessment | null): AufnahmeWerte {
  if (!letzte) return leereAufnahmeWerte();

  return {
    ...aufnahmeZuWerten(letzte),
    datum: datumFuerEingabe(new Date()),
    breiteMm: "",
    laengeMm: "",
    tiefeMm: "",
  };
}
