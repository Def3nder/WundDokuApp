"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { patientAusFormData, type PatientEingabe } from "@/lib/schema/patient";

const NEU = "__NEU__";

class AuswahlFehler extends Error {
  constructor(public feld: string, meldung: string) {
    super(meldung);
  }
}

async function patientDatenMitKontakten(tx: Prisma.TransactionClient, eingabe: PatientEingabe) {
  let arztId = eingabe.arztId;
  let arztName: string;
  let neuerArztId: string | null = null;
  if (arztId === NEU) {
    if (!eingabe.neuerArztName) throw new AuswahlFehler("neuerArztName", "Bitte den Namen des neuen Arztes angeben");
    const arzt = await tx.doctor.create({ data: { name: eingabe.neuerArztName, praxis: eingabe.neueArztPraxis } });
    arztId = arzt.id;
    arztName = arzt.name;
    neuerArztId = arzt.id;
  } else {
    const arzt = await tx.doctor.findFirst({ where: { id: arztId, geloeschtAm: null } });
    if (!arzt) throw new AuswahlFehler("arztId", "Der ausgewählte Arzt ist nicht verfügbar");
    arztName = arzt.name;
  }

  let pflegedienstId = eingabe.pflegedienstId;
  let neuerPflegedienstId: string | null = null;
  if (pflegedienstId === NEU) {
    if (!eingabe.neuerPflegedienstName) throw new AuswahlFehler("neuerPflegedienstName", "Bitte den Namen des neuen Pflegedienstes angeben");
    const dienst = await tx.careService.create({
      data: { name: eingabe.neuerPflegedienstName, ansprechpartner: eingabe.neuerPflegedienstAnsprechpartner },
    });
    pflegedienstId = dienst.id;
    neuerPflegedienstId = dienst.id;
  } else if (pflegedienstId) {
    const dienst = await tx.careService.findFirst({ where: { id: pflegedienstId, geloeschtAm: null } });
    if (!dienst) throw new AuswahlFehler("pflegedienstId", "Der ausgewählte Pflegedienst ist nicht verfügbar");
  }

  return {
    daten: {
      nachname: eingabe.nachname,
      vorname: eingabe.vorname,
      geburtsdatum: eingabe.geburtsdatum,
      patientennummer: eingabe.patientennummer,
      arztId,
      pflegedienstId,
      arztTherapieverantwortlich: arztName,
      notizen: eingabe.notizen,
    },
    neuerArztId,
    neuerPflegedienstId,
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
    if (ergebnis.neuerArztId) await protokolliere(sitzung.user.id, "Doctor", ergebnis.neuerArztId, "ANLEGEN");
    if (ergebnis.neuerPflegedienstId) await protokolliere(sitzung.user.id, "CareService", ergebnis.neuerPflegedienstId, "ANLEGEN");
  } catch (fehler) {
    if (fehler instanceof AuswahlFehler) {
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
    if (ergebnis.neuerArztId) await protokolliere(sitzung.user.id, "Doctor", ergebnis.neuerArztId, "ANLEGEN");
    if (ergebnis.neuerPflegedienstId) await protokolliere(sitzung.user.id, "CareService", ergebnis.neuerPflegedienstId, "ANLEGEN");
  } catch (fehler) {
    if (fehler instanceof AuswahlFehler) {
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
