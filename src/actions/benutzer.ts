"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashePasswort, verlangeAdmin } from "@/lib/auth";
import { protokolliere } from "@/lib/audit";
import { ROLLEN } from "@/lib/enums";
import type { FormZustand } from "./patienten";

const benutzerSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte eine gültige E-Mail-Adresse angeben"),
  handzeichen: z
    .string()
    .trim()
    .min(1, "Handzeichen ist erforderlich")
    .max(6, "Höchstens 6 Zeichen")
    .transform((s) => s.toUpperCase()),
  rolle: z.enum(ROLLEN.map((r) => r.wert) as [string, ...string[]]),
  passwort: z
    .string()
    .min(10, "Mindestens 10 Zeichen")
    .max(200, "Höchstens 200 Zeichen"),
});

function zuFehlern(issues: { path: (string | number)[]; message: string }[]) {
  const fehler: Record<string, string> = {};
  for (const i of issues) {
    const feld = String(i.path[0] ?? "_");
    if (!fehler[feld]) fehler[feld] = i.message;
  }
  return fehler;
}

export async function benutzerAnlegen(
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeAdmin();

  const geprueft = benutzerSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    handzeichen: fd.get("handzeichen"),
    rolle: fd.get("rolle"),
    passwort: fd.get("passwort"),
  });

  if (!geprueft.success) {
    return {
      fehler: zuFehlern(geprueft.error.issues),
      // Das Passwort bewusst NICHT zuruecksenden.
      werte: {
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        handzeichen: String(fd.get("handzeichen") ?? ""),
        rolle: String(fd.get("rolle") ?? ""),
      },
    };
  }

  const { passwort, ...daten } = geprueft.data;

  try {
    const benutzer = await db.user.create({
      data: { ...daten, passwordHash: await hashePasswort(passwort) },
    });
    await protokolliere(sitzung.user.id, "User", benutzer.id, "ANLEGEN");
  } catch (fehler) {
    if (
      fehler instanceof Prisma.PrismaClientKnownRequestError &&
      fehler.code === "P2002"
    ) {
      return { fehler: { email: "Diese E-Mail-Adresse wird bereits verwendet" } };
    }
    throw fehler;
  }

  revalidatePath("/einstellungen/benutzer");
  return { meldung: "Benutzer angelegt." };
}

/**
 * Konto sperren oder entsperren.
 *
 * Statt zu loeschen: Die Zuordnung von Aufnahmen zum Handzeichen muss
 * erhalten bleiben, auch wenn jemand die Einrichtung verlaesst.
 */
export async function benutzerAktivSetzen(
  benutzerId: string,
  aktiv: boolean,
): Promise<void> {
  const sitzung = await verlangeAdmin();

  // Sich nicht selbst aussperren.
  if (benutzerId === sitzung.user.id && !aktiv) {
    throw new Error("Das eigene Konto kann nicht gesperrt werden");
  }

  if (!aktiv) {
    const verbleibendeAdmins = await db.user.count({
      where: { rolle: "ADMIN", aktiv: true, id: { not: benutzerId } },
    });
    if (verbleibendeAdmins === 0) {
      throw new Error("Es muss mindestens ein aktives Administrationskonto geben");
    }
  }

  await db.user.update({ where: { id: benutzerId }, data: { aktiv } });
  await protokolliere(
    sitzung.user.id,
    "User",
    benutzerId,
    "AENDERN",
    aktiv ? "entsperrt" : "gesperrt",
  );

  revalidatePath("/einstellungen/benutzer");
}

export async function passwortZuruecksetzen(
  benutzerId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeAdmin();

  const geprueft = z
    .string()
    .min(10, "Mindestens 10 Zeichen")
    .safeParse(fd.get("passwort"));

  if (!geprueft.success) {
    return { fehler: { passwort: geprueft.error.issues[0].message } };
  }

  await db.user.update({
    where: { id: benutzerId },
    data: { passwordHash: await hashePasswort(geprueft.data) },
  });
  await protokolliere(sitzung.user.id, "User", benutzerId, "AENDERN", "Passwort zurückgesetzt");

  revalidatePath("/einstellungen/benutzer");
  return { meldung: "Passwort geändert." };
}
