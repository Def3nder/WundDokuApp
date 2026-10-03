import { zeitAusEingabe } from "@/lib/arbeitszeit";
import { zeitBuchungSchema, type ZeitErgebnis } from "@/lib/schema/arbeitszeit";

/**
 * Reine Logik fuer die Zeiterfassung ohne Verbindung.
 *
 * Offline erfasste Buchungen warten als unveraenderte Formularwerte auf dem
 * Geraet, bis sie ueber dieselbe Server Action gesendet werden wie online
 * erfasste. Der Server bleibt damit die einzige Stelle, die Ueberschneidungen,
 * Versionen und Berechtigungen verbindlich pruefen.
 */

export type BuchungAnsicht = {
  id: string; beginn: string; ende: string | null; pauseMinuten: number; notiz: string; version: number;
};

export type WarteEintrag = {
  clientId: string;
  userId: string;
  erstellt: string;
  /** Formularwerte exakt so, wie sie an arbeitszeitSpeichern gehen. */
  werte: Record<string, string>;
  /** "pruefen": Der Server hat die Buchung abgewiesen, sie bleibt zur Korrektur erhalten. */
  status: "wartet" | "pruefen";
  meldung?: string;
};

export type Zeitraum = { id?: string; beginn: Date; ende: Date | null };

export const LOKAL_PRAEFIX = "lokal:";

export function werteAusFormData(fd: FormData): Record<string, string> {
  const werte: Record<string, string> = {};
  for (const [name, wert] of fd.entries()) if (typeof wert === "string") werte[name] = wert;
  return werte;
}

export function formDataAus(werte: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [name, wert] of Object.entries(werte)) fd.append(name, wert);
  return fd;
}

/** Der erste Fehlertext, den eine abgewiesene Buchung dem Nutzer erklaert. */
export function ergebnisMeldung(ergebnis: ZeitErgebnis): string {
  return ergebnis.meldung ?? Object.values(ergebnis.fehler ?? {})[0] ?? "Die Buchung wurde vom Server abgewiesen.";
}

export function ansichtAus(eintrag: WarteEintrag): BuchungAnsicht | null {
  const { werte } = eintrag;
  const beginn = zeitAusEingabe(werte.beginn ?? "", werte.beginnVorkommen);
  if (!beginn) return null;
  const ende = werte.ende ? zeitAusEingabe(werte.ende, werte.endeVorkommen) : null;
  return {
    id: werte.id || `${LOKAL_PRAEFIX}${eintrag.clientId}`,
    beginn: beginn.toISOString(),
    ende: ende?.toISOString() ?? null,
    pauseMinuten: Number(werte.pauseMinuten) || 0,
    notiz: werte.notiz ?? "",
    version: Number(werte.version) || 0,
  };
}

export type LaufendeAnsicht = {
  eintrag?: BuchungAnsicht;
  /** Wartender Eintrag, den ein weiteres Speichern ersetzt statt einen zweiten anzulegen. */
  clientId?: string;
  /** Die laufende Zeit existiert bisher nur auf diesem Geraet. */
  lokal?: boolean;
  /** Das Ausstempeln einer Serverbuchung wartet noch auf die Uebertragung. */
  stoppWartet?: boolean;
};

/**
 * Die Stechuhr, wie sie dem Nutzer jetzt erscheinen muss: Serverstand plus
 * alles, was auf dem Geraet schon eingestempelt, ausgestempelt oder
 * korrigiert wurde, aber noch nicht uebertragen ist.
 */
export function laufendeAnsicht(laufend: BuchungAnsicht | undefined, eintraege: WarteEintrag[]): LaufendeAnsicht {
  const wartend = eintraege.filter((e) => e.status === "wartet").sort((a, b) => a.erstellt.localeCompare(b.erstellt));
  if (laufend) {
    const eintrag = wartend.filter((e) => e.werte.id === laufend.id).at(-1);
    if (!eintrag) return { eintrag: laufend };
    const ansicht = ansichtAus(eintrag);
    if (!ansicht) return { eintrag: laufend };
    if (ansicht.ende) return { stoppWartet: true };
    return { eintrag: { ...ansicht, id: laufend.id, version: laufend.version }, clientId: eintrag.clientId };
  }
  const lokal = wartend.filter((e) => !e.werte.id && !e.werte.ende).at(-1);
  const ansicht = lokal && ansichtAus(lokal);
  return lokal && ansicht ? { eintrag: ansicht, clientId: lokal.clientId, lokal: true } : {};
}

/** Zeitraeume der bekannten Buchungen, wobei wartende Aenderungen den Serverstand ersetzen. */
function belegteZeitraeume(bekannt: Zeitraum[], eintraege: WarteEintrag[], ohne: { id?: string; clientId?: string }): Zeitraum[] {
  const wartend = eintraege.filter((e) => e.status === "wartet" && e.clientId !== ohne.clientId);
  const ersetzt = new Set(wartend.map((e) => e.werte.id).filter(Boolean));
  const ausWartenden = wartend.flatMap((e) => {
    const ansicht = ansichtAus(e);
    return ansicht && ansicht.id !== ohne.id ? [{ beginn: new Date(ansicht.beginn), ende: ansicht.ende ? new Date(ansicht.ende) : null }] : [];
  });
  return [...bekannt.filter((b) => b.id !== ohne.id && !(b.id && ersetzt.has(b.id))), ...ausWartenden];
}

/** Dieselbe Regel wie in bucheArbeitszeit: Laufende Zeiten reichen unbegrenzt weit. */
export function ueberschneidet(neu: Zeitraum, bekannt: Zeitraum[], eintraege: WarteEintrag[], ohne: { id?: string; clientId?: string } = {}): boolean {
  const unendlich = Number.POSITIVE_INFINITY;
  return belegteZeitraeume(bekannt, eintraege, ohne).some((b) =>
    neu.beginn.getTime() < (b.ende?.getTime() ?? unendlich) && (neu.ende?.getTime() ?? unendlich) > b.beginn.getTime());
}

export type OfflinePruefung =
  | { ok: true; beginn: Date; ende: Date | null }
  | { ok: false; ergebnis: ZeitErgebnis };

/**
 * Prueft eine Buchung auf dem Geraet, bevor sie warten darf. Alles, was der
 * Server ohnehin beanstanden wuerde und ohne Netz erkennbar ist, soll der
 * Nutzer sofort am Formular sehen und nicht erst spaeter in der Warteschlange.
 */
export function pruefeVorAblage(
  werte: Record<string, string>, bekannt: Zeitraum[], eintraege: WarteEintrag[], clientId?: string, jetzt = new Date(),
): OfflinePruefung {
  const geprueft = zeitBuchungSchema.safeParse(werte);
  if (!geprueft.success) return { ok: false, ergebnis: { fehler: Object.fromEntries(geprueft.error.issues.map((e) => [e.path[0], e.message])) } };
  const { beginn, ende } = geprueft.data;
  // Eine Minute Toleranz fuer Uhren, die minimal voneinander abweichen.
  const grenze = jetzt.getTime() + 60_000;
  if (beginn.getTime() > grenze || (ende && ende.getTime() > grenze)) {
    return { ok: false, ergebnis: { meldung: "Arbeitszeiten können nicht in der Zukunft gebucht werden." } };
  }
  if (ueberschneidet({ beginn, ende }, bekannt, eintraege, { id: werte.id || undefined, clientId })) {
    return { ok: false, ergebnis: { meldung: "Dieser Zeitraum überschneidet sich mit einer anderen Buchung oder einer laufenden Stechuhr." } };
  }
  return { ok: true, beginn, ende };
}
