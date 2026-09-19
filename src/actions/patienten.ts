"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { patientAusFormData } from "@/lib/schema/patient";

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
    const patient = await db.patient.create({
      data: { ...geprueft.data, angelegtVonId: sitzung.user.id },
    });
    neuerId = patient.id;
    await protokolliere(sitzung.user.id, "Patient", patient.id, "ANLEGEN");
  } catch (fehler) {
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

  try {
    await db.patient.update({ where: { id: patientId }, data: geprueft.data });
  } catch (fehler) {
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
    geaenderteFelder(vorher, geprueft.data),
  );

  revalidatePath("/");
  revalidatePath(`/patienten/${patientId}`);
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
