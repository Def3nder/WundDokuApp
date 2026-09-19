import { db } from "@/lib/db";

export type Entitaet = "Patient" | "Wound" | "Assessment" | "Photo" | "User";
export type Aktion =
  | "ANLEGEN"
  | "AENDERN"
  | "LOESCHEN"
  | "WIEDERHERSTELLEN"
  | "PDF_EXPORT"
  | "ANMELDEN";

/**
 * Schreibt einen Eintrag ins Aenderungsprotokoll.
 *
 * Bewusst fehlertolerant: Wenn das Protokoll klemmt, darf deshalb nicht die
 * Dokumentation der Wunde verlorengehen. Der Fehler landet in der Konsole.
 */
export async function protokolliere(
  userId: string | null,
  entitaet: Entitaet,
  entitaetId: string,
  aktion: Aktion,
  details?: string,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { userId, entitaet, entitaetId, aktion, details: details ?? null },
    });
  } catch (fehler) {
    console.error("Audit-Eintrag fehlgeschlagen:", fehler);
  }
}

/**
 * Beschreibt knapp, welche Felder sich geaendert haben.
 *
 * Es werden nur die Feldnamen festgehalten, nicht die Werte - ein Protokoll,
 * das alte Diagnosen im Klartext aufbewahrt, waere eine zweite Datenhaltung
 * mit denselben Schutzanforderungen.
 */
export function geaenderteFelder(
  vorher: Record<string, unknown>,
  nachher: Record<string, unknown>,
): string | undefined {
  const felder = Object.keys(nachher).filter((k) => {
    const a = vorher[k];
    const b = nachher[k];
    if (a instanceof Date && b instanceof Date) return a.getTime() !== b.getTime();
    return a !== b;
  });
  return felder.length > 0 ? felder.join(", ") : undefined;
}
