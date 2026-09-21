export const NEUER_STAMMDATENSATZ = "__NEU__";

export type VersorgungspartnerOption = {
  id: string;
  name: string;
  zusatz?: string | null;
  suchbegriffe?: readonly (string | null | undefined)[];
};

/** Vereinheitlicht Titel, Satzzeichen und Umlaute fuer eine fehlertolerante Suche. */
export function normalisiereVersorgungspartnerSuche(wert: string): string {
  return wert
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("de-DE")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Alle eingegebenen Begriffe muessen irgendwo im gesamten Eintrag vorkommen. */
export function filtereVersorgungspartner(
  optionen: readonly VersorgungspartnerOption[],
  suche: string,
): VersorgungspartnerOption[] {
  const begriffe = normalisiereVersorgungspartnerSuche(suche).split(" ").filter(Boolean);
  if (begriffe.length === 0) return [...optionen];

  return optionen.filter((option) => {
    const suchtext = normalisiereVersorgungspartnerSuche(
      [option.name, option.zusatz, ...(option.suchbegriffe ?? [])].filter(Boolean).join(" "),
    );
    return begriffe.every((begriff) => suchtext.includes(begriff));
  });
}
