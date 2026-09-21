"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { patientAusFormData, type PatientEingabe } from "@/lib/schema/patient";
import {
  VersorgungspartnerFehler,
  versorgungspartnerAufloesen,
} from "@/lib/versorgungspartner-server";

async function patientDatenMitKontakten(tx: Prisma.TransactionClient, eingabe: PatientEingabe) {
  const kontakte = await versorgungspartnerAufloesen(tx, eingabe, { arztPflicht: true });

  return {
    daten: {
      nachname: eingabe.nachname,
      vorname: eingabe.vorname,
      geburtsdatum: eingabe.geburtsdatum,
      patientennummer: eingabe.patientennummer,
      arztId: kontakte.arztId,
      pflegedienstId: kontakte.pflegedienstId,
      arztTherapieverantwortlich: kontakte.arztName,
      notizen: eingabe.notizen,
    },
    neuerArztId: kontakte.neuerArztId,
    neuerArztName: kontakte.arztName,
    neuerPflegedienstId: kontakte.neuerPflegedienstId,
    neuerPflegedienstName: kontakte.pflegedienstName,
  };
}

export type FormZustand = {
  /** Feldname -> Meldung */
  fehler?: Record<string, string>;
  /** Meldung, die zu keinem einzelnen Feld gehoert */
  meldung?: string;
  /** Eingaben zuruecksenden, damit nach einem Fehler nichts neu getippt werden muss */
  werte?: Record<string, string>;
};

/** Wandelt Zod-Fehler in die flache Struktur fuer die Fehleruebersicht. */
function zuFehlern(issues: { path: (string | number)[]; message: string }[]) {
  const fehler: Record<string, string> = {};
  for (const i of issues) {
    const feld = String(i.path[0] ?? "_");
    if (!fehler[feld]) fehler[feld] = i.message;
  }
  return fehler;
}

function werteAus(fd: FormData): Record<string, string> {
  const werte: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") werte[k] = v;
  }
  return werte;
}

export async function patientAnlegen(
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = patientAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues), werte: werteAus(fd) };
  }

  let neuerId: string;
  try {
    const ergebnis = await db.$transaction(async (tx) => {
      const kontakte = await patientDatenMitKontakten(tx, geprueft.data);
      const patient = await tx.patient.create({
        data: { ...kontakte.daten, angelegtVonId: sitzung.user.id },
      });
      return { patient, ...kontakte };
    });
    neuerId = ergebnis.patient.id;
    await protokolliere(sitzung.user.id, "Patient", ergebnis.patient.id, "ANLEGEN");
    if (ergebnis.neuerArztId) await protokolliere(sitzung.user.id, "Doctor", ergebnis.neuerArztId, "ANLEGEN", ergebnis.neuerArztName ?? undefined);
    if (ergebnis.neuerPflegedienstId) await protokolliere(sitzung.user.id, "CareService", ergebnis.neuerPflegedienstId, "ANLEGEN", ergebnis.neuerPflegedienstName ?? undefined);
  } catch (fehler) {
    if (fehler instanceof VersorgungspartnerFehler) {
      return { fehler: { [fehler.feld]: fehler.message }, werte: werteAus(fd) };
    }
    if (
      fehler instanceof Prisma.PrismaClientKnownRequestError &&
      fehler.code === "P2002"
    ) {
      return {
        fehler: { patientennummer: "Diese Patientennummer ist bereits vergeben" },
        werte: werteAus(fd),
      };
    }
    throw fehler;
  }

  revalidatePath("/");
  revalidatePath("/einstellungen/stammdaten");
  // redirect wirft - deshalb ausserhalb des try, sonst faengt der catch sie ab.
  redirect(`/patienten/${neuerId}`);
}

export async function patientAendern(
  patientId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = patientAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues), werte: werteAus(fd) };
  }

  const vorher = await db.patient.findUnique({ where: { id: patientId } });
  if (!vorher || vorher.geloeschtAm) {
    return { meldung: "Dieser Patient existiert nicht mehr." };
  }

  let gespeicherteDaten: Awaited<ReturnType<typeof patientDatenMitKontakten>>["daten"];
  try {
    const ergebnis = await db.$transaction(async (tx) => {
      const kontakte = await patientDatenMitKontakten(tx, geprueft.data);
      await tx.patient.update({ where: { id: patientId }, data: kontakte.daten });
      return kontakte;
    });
    gespeicherteDaten = ergebnis.daten;
    if (ergebnis.neuerArztId) await protokolliere(sitzung.user.id, "Doctor", ergebnis.neuerArztId, "ANLEGEN", ergebnis.neuerArztName ?? undefined);
    if (ergebnis.neuerPflegedienstId) await protokolliere(sitzung.user.id, "CareService", ergebnis.neuerPflegedienstId, "ANLEGEN", ergebnis.neuerPflegedienstName ?? undefined);
  } catch (fehler) {
    if (fehler instanceof VersorgungspartnerFehler) {
      return { fehler: { [fehler.feld]: fehler.message }, werte: werteAus(fd) };
    }
    if (
      fehler instanceof Prisma.PrismaClientKnownRequestError &&
      fehler.code === "P2002"
    ) {
      return {
        fehler: { patientennummer: "Diese Patientennummer ist bereits vergeben" },
        werte: werteAus(fd),
      };
    }
    throw fehler;
  }

  await protokolliere(
    sitzung.user.id,
    "Patient",
    patientId,
    "AENDERN",
    geaenderteFelder(vorher, gespeicherteDaten),
  );

  revalidatePath("/");
  revalidatePath(`/patienten/${patientId}`);
  revalidatePath("/einstellungen/stammdaten");
  redirect(`/patienten/${patientId}`);
}

/**
 * Weiches Loeschen. Behandlungsdokumentation darf nicht durch einen Fehlklick
 * verschwinden - der Eintrag wird nur ausgeblendet und bleibt wiederherstellbar.
 */
export async function patientLoeschen(patientId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  await db.patient.update({
    where: { id: patientId },
    data: { geloeschtAm: new Date() },
  });
  await protokolliere(sitzung.user.id, "Patient", patientId, "LOESCHEN");

  revalidatePath("/");
  redirect("/");
}

export async function patientWiederherstellen(patientId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  await db.patient.update({
    where: { id: patientId },
    data: { geloeschtAm: null },
  });
  await protokolliere(sitzung.user.id, "Patient", patientId, "WIEDERHERSTELLEN");

  revalidatePath("/");
  revalidatePath(`/patienten/${patientId}`);
}
