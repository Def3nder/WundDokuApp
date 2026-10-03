/**
 * Entscheidet, ob eine Aufnahme den Status ihrer Wunde aendert.
 *
 * Bewusst ohne Datenbankbezug: Die Regel ist die eigentliche Fachlogik hinter
 * "Wunde ist abgeheilt" und laesst sich so direkt pruefen.
 */

export type Statuswechsel = {
  /** Neuer Wert fuer `Wound.abgeschlossenAm`. */
  abgeschlossenAm: Date | null;
  /** Text fuer das Aenderungsprotokoll. */
  protokoll: "abgeschlossen" | "wiedereröffnet";
};

/**
 * `null` bedeutet: Der Wundstatus bleibt, wie er ist.
 *
 * @param geheilt In dieser Aufnahme wurde die Abheilung festgestellt.
 * @param aufnahmedatum Zaehlt als Abschlussdatum - nicht der Speicherzeitpunkt,
 *   damit nachgetragene Termine den richtigen Behandlungstag tragen.
 * @param eroeffnetWiederBeiNein Trifft zu, wenn ein fehlender Haken die Wunde
 *   wieder oeffnen soll: bei einer neuen Folgeaufnahme auf einer bereits
 *   abgeschlossenen Wunde, oder wenn genau diese Aufnahme sie zuvor geschlossen
 *   hatte. Andernfalls laesst das Korrigieren einer alten Aufnahme eine
 *   spaeter abgeheilte Wunde unberuehrt.
 */
export function statuswechsel(
  geheilt: boolean,
  aufnahmedatum: Date,
  eroeffnetWiederBeiNein: boolean,
): Statuswechsel | null {
  if (geheilt) {
    return { abgeschlossenAm: aufnahmedatum, protokoll: "abgeschlossen" };
  }
  return eroeffnetWiederBeiNein
    ? { abgeschlossenAm: null, protokoll: "wiedereröffnet" }
    : null;
}
