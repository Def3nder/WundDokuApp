import { Prisma, type PrismaClient } from "@prisma/client";
import type { ZeitBuchungDaten, ZeitVorgabeDaten } from "@/lib/schema/arbeitszeit";

export class ZeitKonflikt extends Error {}
const GEANDERT = "Der Eintrag wurde inzwischen geändert. Bitte die Seite neu laden und erneut prüfen.";

function pruefeVergangenheit(datum: Date, jetzt: Date) {
  if (datum.getTime() > jetzt.getTime()) throw new ZeitKonflikt("Arbeitszeiten können nicht in der Zukunft gebucht werden.");
}

type Inhalt = { beginn: Date; ende: Date | null; pauseMinuten: number; notiz: string };

function gleicherInhalt(eintrag: Inhalt, daten: Inhalt): boolean {
  return eintrag.beginn.getTime() === daten.beginn.getTime()
    && (eintrag.ende?.getTime() ?? null) === (daten.ende?.getTime() ?? null)
    && eintrag.pauseMinuten === daten.pauseMinuten && eintrag.notiz === daten.notiz;
}

/**
 * Alle Zugriffe werden aus der Sitzung abgeleitet, nie aus einer Nutzer-ID im Formular.
 *
 * Offline erfasste Buchungen werden spaeter vom Geraet gesendet und nach
 * verlorener Antwort unter Umstaenden ein zweites Mal. Eine Buchung mit
 * identischem Inhalt gilt deshalb als bereits uebernommen und wird unveraendert
 * zurueckgegeben, statt als Ueberschneidung oder Versionskonflikt abgewiesen
 * zu werden.
 */
export async function bucheArbeitszeit(db: PrismaClient, userId: string, daten: ZeitBuchungDaten, jetzt = new Date()) {
  pruefeVergangenheit(daten.beginn, jetzt);
  if (daten.ende) pruefeVergangenheit(daten.ende, jetzt);
  return db.$transaction(async (tx) => {
    if (daten.id) {
      const vorher = await tx.timeEntry.findFirst({ where: { id: daten.id, userId, geloeschtAm: null } });
      if (!vorher) throw new ZeitKonflikt("Dieser Zeiteintrag ist nicht verfügbar.");
      if (vorher.version !== daten.version) {
        if (gleicherInhalt(vorher, daten)) return vorher;
        throw new ZeitKonflikt(GEANDERT);
      }
      if (vorher.ende && !daten.ende) throw new ZeitKonflikt("Eine abgeschlossene Buchung benötigt eine Endzeit.");
    } else {
      const vorhanden = await tx.timeEntry.findFirst({
        where: { userId, geloeschtAm: null, beginn: daten.beginn, ende: daten.ende, pauseMinuten: daten.pauseMinuten, notiz: daten.notiz },
      });
      if (vorhanden) return vorhanden;
    }
    const ueberlappung = await tx.timeEntry.findFirst({
      where: {
        userId, geloeschtAm: null,
        ...(daten.id ? { id: { not: daten.id } } : {}),
        ...(daten.ende ? { beginn: { lt: daten.ende } } : {}),
        OR: [{ ende: null }, { ende: { gt: daten.beginn } }],
      },
      select: { id: true },
    });
    if (ueberlappung) throw new ZeitKonflikt("Dieser Zeitraum überschneidet sich mit einer anderen Buchung oder einer laufenden Stechuhr.");
    const inhalt = {
      beginn: daten.beginn, ende: daten.ende, pauseMinuten: daten.pauseMinuten, notiz: daten.notiz,
      laufendFuer: daten.ende ? null : userId,
    };
    const eintrag = daten.id
      ? await tx.timeEntry.update({ where: { id: daten.id, userId, version: daten.version, geloeschtAm: null }, data: { ...inhalt, version: { increment: 1 } } })
      : await tx.timeEntry.create({ data: { ...inhalt, userId } });
    await tx.auditLog.create({ data: {
      userId, entitaet: "TimeEntry", entitaetId: eintrag.id, aktion: daten.id ? "AENDERN" : "ANLEGEN",
      details: daten.id ? "Arbeitszeit korrigiert oder beendet" : "Arbeitszeit erfasst",
    } });
    return eintrag;
  });
}

export async function entferneArbeitszeit(db: PrismaClient, userId: string, id: string, version: number) {
  return db.$transaction(async (tx) => {
    const ergebnis = await tx.timeEntry.updateMany({
      where: { id, userId, version, geloeschtAm: null },
      data: { geloeschtAm: new Date(), laufendFuer: null, version: { increment: 1 } },
    });
    if (ergebnis.count !== 1) throw new ZeitKonflikt(GEANDERT);
    await tx.auditLog.create({ data: { userId, entitaet: "TimeEntry", entitaetId: id, aktion: "LOESCHEN", details: "Arbeitszeit gelöscht" } });
  });
}

export async function speichereZeitVorgabe(db: PrismaClient, userId: string, daten: ZeitVorgabeDaten) {
  return db.$transaction(async (tx) => {
    const inhalt = { abDatum: daten.abDatum, standardBeginn: daten.standardBeginn, standardEnde: daten.standardEnde, wochenMinuten: daten.wochenMinuten, pauseMinuten: daten.pauseMinuten, arbeitstage: JSON.stringify([...daten.arbeitstage].sort((a, b) => a - b)) };
    if (daten.id) {
      const vorher = await tx.timeSettings.findFirst({ where: { id: daten.id, userId, version: daten.version } });
      if (!vorher) throw new ZeitKonflikt(GEANDERT);
      // Den Beginn einer vorhandenen Periode nicht unbemerkt verschieben.
      if (vorher.abDatum !== daten.abDatum) throw new ZeitKonflikt("Für ein anderes Gültigkeitsdatum bitte eine neue Vorgabe anlegen.");
    }
    const vorgabe = daten.id
      ? await tx.timeSettings.update({ where: { id: daten.id, userId, version: daten.version }, data: { ...inhalt, version: { increment: 1 } } })
      : await tx.timeSettings.create({ data: { ...inhalt, userId } });
    await tx.auditLog.create({ data: { userId, entitaet: "TimeSettings", entitaetId: vorgabe.id, aktion: daten.id ? "AENDERN" : "ANLEGEN", details: `Arbeitszeitvorgabe ab ${daten.abDatum}` } });
    return vorgabe;
  });
}

export function zeitFehlermeldung(fehler: unknown): string {
  if (fehler instanceof ZeitKonflikt) return fehler.message;
  if (fehler instanceof Prisma.PrismaClientKnownRequestError) {
    if (fehler.code === "P2002") return "Diese Buchung oder eine Vorgabe für dieses Datum existiert bereits. Bitte die Seite neu laden.";
    if (["P2025", "P2034", "P1008", "P2028"].includes(fehler.code)) return "Die Daten wurden gleichzeitig bearbeitet. Bitte die Seite neu laden und erneut versuchen.";
  }
  console.error("Zeiterfassung fehlgeschlagen:", fehler);
  return "Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.";
}
