/**
 * Alle Auswahlwerte des Wunddokumentationsbogens an einer Stelle.
 *
 * Formular, PDF-Export, Diagramme und Vergleichstabelle lesen ausschliesslich
 * hieraus, damit Bezeichnungen nirgends auseinanderlaufen. Die Reihenfolge der
 * Eintraege entspricht der Reihenfolge auf dem Papierbogen.
 */

export type Option<T extends string = string> = {
  wert: T;
  label: string;
  /** Kurzform fuer enge Stellen wie Diagramm-Legenden und Tabellen */
  kurz?: string;
};

function optionen<const T extends readonly Option[]>(o: T) {
  return o;
}

/** Sucht das Label zu einem Wert; gibt den Wert zurueck, wenn nichts passt. */
export function labelVon(liste: readonly Option[], wert: string | null | undefined): string {
  if (!wert) return "";
  return liste.find((o) => o.wert === wert)?.label ?? wert;
}

/** Labels zu einer Mehrfachauswahl, in der Reihenfolge des Bogens. */
export function labelsVon(liste: readonly Option[], werte: readonly string[]): string[] {
  return liste.filter((o) => werte.includes(o.wert)).map((o) => o.label);
}

// ---------------------------------------------------------------- Stammdaten

export const ROLLEN = optionen([
  { wert: "ADMIN", label: "Administration" },
  { wert: "PFLEGE", label: "Pflege" },
] as const);

// ------------------------------------------------------------------ Diagnose

export const DIAGNOSE_TYPEN = optionen([
  { wert: "ULCUS_CRURIS_ARTERIOSUM", label: "Ulcus cruris arteriosum", kurz: "UC arteriosum" },
  { wert: "ULCUS_CRURIS_VENOSUM", label: "Ulcus cruris venosum (Widmer)", kurz: "UC venosum" },
  { wert: "ULCUS_CRURIS_MIXTUM", label: "Ulcus cruris mixtum", kurz: "UC mixtum" },
  { wert: "ULCUS_CRURIS_SONSTIGE", label: "Ulcus cruris, sonstige Ursache", kurz: "UC sonstige" },
  { wert: "DFS", label: "Diabetisches Fußsyndrom (Wagner/Armstrong)", kurz: "DFS" },
  { wert: "DEKUBITUS", label: "Dekubitus", kurz: "Dekubitus" },
  { wert: "POST_OP", label: "Post-OP-Wunde", kurz: "Post-OP" },
  { wert: "SONSTIGE", label: "Sonstige Wunde", kurz: "Sonstige" },
] as const);

/** Nur bei diesen Diagnosen wird nach dem Wagner/Armstrong-Grad gefragt. */
export const DIAGNOSEN_MIT_WAGNER = ["DFS"] as const;
/** Nur hier wird nach der Dekubitus-Kategorie gefragt. */
export const DIAGNOSEN_MIT_KATEGORIE = ["DEKUBITUS"] as const;

export const WAGNER_GRADE = optionen([
  { wert: "0", label: "Grad 0 – keine Läsion, ggf. Fußdeformation" },
  { wert: "1", label: "Grad 1 – oberflächliche Ulzeration" },
  { wert: "2", label: "Grad 2 – Ulkus bis Sehne oder Kapsel" },
  { wert: "3", label: "Grad 3 – Ulkus bis Knochen oder Gelenk" },
  { wert: "4", label: "Grad 4 – begrenzte Nekrose (Vorfuß, Ferse)" },
  { wert: "5", label: "Grad 5 – Nekrose des gesamten Fußes" },
] as const);

export const DEKUBITUS_KATEGORIEN = optionen([
  { wert: "1", label: "Kategorie 1 – nicht wegdrückbare Rötung" },
  { wert: "2", label: "Kategorie 2 – Teilverlust der Haut" },
  { wert: "3", label: "Kategorie 3 – vollständiger Hautverlust" },
  { wert: "4", label: "Kategorie 4 – vollständiger Gewebeverlust" },
  { wert: "NICHT_KLASSIFIZIERBAR", label: "Nicht klassifizierbar" },
  { wert: "TIEFE_UNBEKANNT", label: "Vermutete tiefe Gewebeschädigung" },
] as const);

// -------------------------------------------------------------- Lokalisation

export const SEITEN = optionen([
  { wert: "LINKS", label: "Links" },
  { wert: "RECHTS", label: "Rechts" },
] as const);

export const AUSRICHTUNGEN = optionen([
  { wert: "LATERAL", label: "Lateral" },
  { wert: "MEDIAL", label: "Medial" },
] as const);

export const KOERPERREGIONEN = optionen([
  { wert: "UNTERSCHENKEL", label: "Unterschenkel" },
  { wert: "KNOECHEL", label: "Knöchel" },
  { wert: "FERSE", label: "Ferse" },
  { wert: "FUSSRUECKEN", label: "Fußrücken" },
  { wert: "FUSSSOHLE", label: "Fußsohle" },
  { wert: "ZEHEN", label: "Zehen" },
  { wert: "KNIE", label: "Knie" },
  { wert: "OBERSCHENKEL", label: "Oberschenkel" },
  { wert: "STEISS_SAKRAL", label: "Steiß / Sakralbereich" },
  { wert: "TROCHANTER", label: "Trochanter" },
  { wert: "GESAESS", label: "Gesäß" },
  { wert: "RUECKEN", label: "Rücken" },
  { wert: "SCHULTER", label: "Schulter" },
  { wert: "ARM", label: "Arm" },
  { wert: "HAND", label: "Hand" },
  { wert: "KOPF", label: "Kopf" },
  { wert: "RUMPF", label: "Rumpf" },
  { wert: "SONSTIGE", label: "Sonstige Region" },
] as const);

export const ZEITEINHEITEN = optionen([
  { wert: "TAGE", label: "Tagen" },
  { wert: "WOCHEN", label: "Wochen" },
  { wert: "MONATE", label: "Monaten" },
  { wert: "JAHRE", label: "Jahren" },
] as const);

// ---------------------------------------------------------------- Aufnahmetyp

export const AUFNAHME_TYPEN = optionen([
  { wert: "ERSTAUFNAHME", label: "Erstaufnahme" },
  { wert: "FOLGEAUFNAHME", label: "Folgeaufnahme" },
] as const);

// -------------------------------------------------------------- Wundumgebung

export const WUNDUMGEBUNG = optionen([
  { wert: "UNAUFFAELLIG", label: "Unauffällig" },
  { wert: "GEROETET", label: "Gerötet" },
  { wert: "MAZERIERT", label: "Mazeriert" },
  { wert: "JUCKREIZ", label: "Juckreiz" },
  { wert: "HAEMATOME", label: "Hämatome" },
  { wert: "FEUCHT", label: "Feucht" },
  { wert: "TROCKEN", label: "Trocken" },
  { wert: "ERWAERMT", label: "Erwärmt" },
  { wert: "BLASENBILDUNG", label: "Blasenbildung" },
  { wert: "BLAEULICH", label: "Bläulich" },
] as const);

/** "Unauffällig" schliesst alle anderen Befunde der Wundumgebung aus. */
export const WUNDUMGEBUNG_EXKLUSIV = "UNAUFFAELLIG";

// ------------------------------------------------------------------ Wundrand

export const WUNDRAND = optionen([
  { wert: "UNTERMINIERT", label: "Unterminiert" },
  { wert: "MAZERIERT", label: "Mazeriert" },
  { wert: "GEROETET", label: "Gerötet" },
  { wert: "NEKROTISCH", label: "Nekrotisch" },
  { wert: "HYPERKERATOTISCH", label: "Hyperkeratotisch" },
] as const);

// ----------------------------------------------------------------- Wundgrund

export const WUNDGRUND = optionen([
  { wert: "EPITHELGEWEBE", label: "Epithelgewebe/Inseln", kurz: "Epithel" },
  { wert: "FEHLENDE_GRANULATION", label: "Fehlende Granulation", kurz: "Keine Granul." },
  { wert: "GRANULATION", label: "Granulation", kurz: "Granulation" },
  { wert: "GRANULATIONSOEDEM", label: "Granulationsödem", kurz: "Granul.ödem" },
  { wert: "HYPERGRANULATION", label: "Hypergranulation", kurz: "Hypergranul." },
  { wert: "BIOFILM", label: "Biofilm", kurz: "Biofilm" },
  { wert: "WEICHE_NEKROSE", label: "Weiche/feuchte Nekrose", kurz: "Weiche Nekrose" },
  { wert: "MUSKELN_SEHNEN_FASZIEN", label: "Muskeln/Sehnen/Faszien", kurz: "Muskel/Sehne" },
  { wert: "KNOCHEN", label: "Knochen", kurz: "Knochen" },
  { wert: "HAEMATOME", label: "Hämatome", kurz: "Hämatome" },
  { wert: "KALKABLAGERUNG", label: "Kalkablagerung", kurz: "Kalk" },
  { wert: "FREMDKOERPER", label: "Fremdkörper", kurz: "Fremdkörper" },
  { wert: "FIBRINBELAEGE", label: "Fibrinbeläge", kurz: "Fibrin" },
  { wert: "FESTE_NEKROSE", label: "Feste/trockene Nekrose", kurz: "Feste Nekrose" },
  { wert: "SONSTIGES", label: "Sonstiges", kurz: "Sonstiges" },
] as const);

/**
 * Gruppierung fuer das gestapelte Verlaufsdiagramm "Wundgrund-Zusammensetzung".
 * Zeigt auf einen Blick, ob die Wunde sauber wird.
 */
export const WUNDGRUND_GRUPPEN = [
  {
    id: "EPITHEL",
    label: "Epithel",
    /** gut - Heilung schreitet voran */
    tendenz: "gut" as const,
    werte: ["EPITHELGEWEBE"],
  },
  {
    id: "GRANULATION",
    label: "Granulation",
    tendenz: "gut" as const,
    werte: ["GRANULATION", "GRANULATIONSOEDEM", "HYPERGRANULATION"],
  },
  {
    id: "FIBRIN",
    label: "Fibrin / Biofilm",
    tendenz: "mittel" as const,
    werte: ["FIBRINBELAEGE", "BIOFILM", "FEHLENDE_GRANULATION"],
  },
  {
    id: "NEKROSE",
    label: "Nekrose",
    tendenz: "schlecht" as const,
    werte: ["WEICHE_NEKROSE", "FESTE_NEKROSE"],
  },
  {
    id: "TIEFE_STRUKTUREN",
    label: "Tiefe Strukturen",
    tendenz: "schlecht" as const,
    werte: ["MUSKELN_SEHNEN_FASZIEN", "KNOCHEN"],
  },
] as const;

// ---------------------------------------------------------------- Exsudation

/**
 * Der Bogen hat genau vier Ankreuzfelder. Die vierte Stufe steht im PDF-Text
 * als "Mäßige bis Schwache" - das ist ein Tippfehler im Original, gemeint ist
 * die Steigerung nach oben. Wir dokumentieren die klinisch sinnvolle Variante.
 * `stufe` wird fuer das Verlaufsdiagramm gebraucht.
 */
export const EXSUDAT_MENGEN = optionen([
  { wert: "KEINE", label: "Keine", kurz: "keine" },
  { wert: "KEINE_BIS_SCHWACH", label: "Keine bis schwache", kurz: "keine–schwach" },
  { wert: "SCHWACH_BIS_MAESSIG", label: "Schwache bis mäßige", kurz: "schwach–mäßig" },
  { wert: "MAESSIG_BIS_STARK", label: "Mäßige bis starke", kurz: "mäßig–stark" },
] as const);

/** Ordinalwert 0-3 fuer die Achse des Exsudat-Diagramms. */
export const EXSUDAT_STUFE: Record<string, number> = {
  KEINE: 0,
  KEINE_BIS_SCHWACH: 1,
  SCHWACH_BIS_MAESSIG: 2,
  MAESSIG_BIS_STARK: 3,
};

export const EXSUDAT_FARBEN = optionen([
  { wert: "KLAR", label: "Klar" },
  { wert: "TRUEB", label: "Trüb" },
  { wert: "GELB", label: "Gelb" },
  { wert: "BLUTIG", label: "Blutig" },
  { wert: "GRUEN", label: "Grün" },
  { wert: "SONSTIGES", label: "Sonstiges" },
] as const);

export const EXSUDAT_KONSISTENZ = optionen([
  { wert: "SEROES", label: "Serös" },
  { wert: "SCHLEIMIG", label: "Schleimig" },
] as const);

// ------------------------------------------------------ Entzuendung/Infektion

export const ENTZUENDUNGSZEICHEN = optionen([
  { wert: "ROETUNG", label: "Rötung" },
  { wert: "SCHWELLUNG", label: "Schwellung" },
  { wert: "WAERME", label: "Wärme" },
  { wert: "SCHMERZ", label: "Schmerz" },
  { wert: "FUNKTIONSEINSCHRAENKUNG", label: "Funktionseinschränkung" },
] as const);

export const LOKALE_INFEKTZEICHEN = optionen([
  { wert: "KRITISCHE_KOLONISATION", label: "Kritische Kolonisation" },
  { wert: "WUNDINFEKTION", label: "Wundinfektion" },
] as const);

// ------------------------------------------------------------------- Schmerz

export const SCHMERZ_ORT_MODI = optionen([
  { wert: "GESAMT", label: "Gesamter Wundgrund" },
  { wert: "UHR", label: "Auf … Uhr" },
] as const);

/** Die drei Schmerzorte des Bogens, jeweils mit Modus und Uhrzeit. */
export const SCHMERZ_ORTE = [
  { id: "wunde", label: "In der Wunde", modusFeld: "schmerzWundeModus", uhrFeld: "schmerzWundeUhr" },
  { id: "wundrand", label: "Am Wundrand", modusFeld: "schmerzWundrandModus", uhrFeld: "schmerzWundrandUhr" },
  { id: "wundumgebung", label: "Wundumgebung", modusFeld: "schmerzWundumgebungModus", uhrFeld: "schmerzWundumgebungUhr" },
] as const;

/** Zusaetzliche Schmerzsituationen mit eigener VAS. */
export const SCHMERZ_SITUATIONEN = [
  { id: "verbandwechsel", label: "Schmerzen beim Verbandwechsel", boolFeld: "schmerzVerbandwechsel", vasFeld: "schmerzVerbandwechselVas" },
  { id: "druck", label: "Schmerzen bei Druck", boolFeld: "schmerzDruck", vasFeld: "schmerzDruckVas" },
  { id: "ueberall", label: "Überall im Bereich der Wunde", boolFeld: "schmerzUeberall", vasFeld: "schmerzUeberallVas" },
] as const;

export const VAS_MIN = 0;
export const VAS_MAX = 10;

// -------------------------------------------------------------- Therapieplan

export const WUNDSPUELUNG = optionen([
  { wert: "NACL", label: "NaCl 0,9 %" },
  { wert: "RINGER", label: "Ringer" },
  { wert: "POLYHEXANID", label: "Polyhexanid" },
  { wert: "OCTENISEPT", label: "Octenisept" },
] as const);

export const REINIGUNG = optionen([
  { wert: "CHIRURGISCH", label: "Chirurgisch" },
  { wert: "MECHANISCH", label: "Mechanisch" },
  { wert: "AUTOLYTISCH", label: "Autolytisch" },
] as const);

export const WUNDFUELLUNG = optionen([
  { wert: "HYDROFASER", label: "Hydrofaser" },
  { wert: "HYDROGEL", label: "Hydrogel" },
  { wert: "ALGINAT", label: "Alginat" },
  { wert: "CAVITY_SCHAUM", label: "Cavity-Schaum" },
] as const);

export const WUNDABDECKUNG = optionen([
  { wert: "DISTANZGITTER", label: "Distanzgitter" },
  { wert: "KOMPRESSE", label: "Kompresse" },
  { wert: "HYDROKOLLOID", label: "Hydrokolloid" },
  { wert: "SCHAUMVERBAND", label: "Schaumverband" },
  { wert: "SAUGKOMPRESSE", label: "Saugkompresse" },
  { wert: "FOLIE", label: "Folie" },
] as const);

export const FIXIERUNG = optionen([
  { wert: "SELBSTKLEBEND", label: "Selbstklebend" },
  { wert: "FOLIE", label: "Folie" },
  { wert: "FIXIERMULL", label: "Fixiermull" },
  { wert: "MULLBINDE", label: "Mullbinde" },
] as const);

export const KOMPRESSION = optionen([
  { wert: "KURZZUGBINDE", label: "Kurzzugbinde" },
  { wert: "STRUMPF", label: "Strumpf" },
] as const);

export const KOMPRESSIONSKLASSEN = optionen([
  { wert: "KKL1", label: "KKL 1 (18–21 mmHg)" },
  { wert: "KKL2", label: "KKL 2 (23–32 mmHg)" },
  { wert: "KKL3", label: "KKL 3 (34–46 mmHg)" },
  { wert: "KKL4", label: "KKL 4 (ab 49 mmHg)" },
] as const);

// ------------------------------------------------------------------- Audit

export const AUDIT_AKTIONEN = optionen([
  { wert: "ANLEGEN", label: "Angelegt" },
  { wert: "AENDERN", label: "Geändert" },
  { wert: "LOESCHEN", label: "Gelöscht" },
  { wert: "WIEDERHERSTELLEN", label: "Wiederhergestellt" },
  { wert: "PDF_EXPORT", label: "PDF exportiert" },
  { wert: "ANMELDEN", label: "Angemeldet" },
] as const);
