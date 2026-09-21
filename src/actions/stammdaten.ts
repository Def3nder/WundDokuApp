"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { protokolliere } from "@/lib/audit";

async function admin() {
  const sitzung = await verlangeSitzung();
  if (sitzung.user.rolle !== "ADMIN") throw new Error("Nicht berechtigt");
  return sitzung;
}

const text = (fd: FormData, name: string, max = 150) => String(fd.get(name) ?? "").trim().slice(0, max) || null;

export async function arztSpeichern(id: string | null, fd: FormData): Promise<void> {
  const sitzung = await admin();
  const name = text(fd, "name");
  if (!name) return;
  const daten = { name, praxis: text(fd, "praxis"), telefon: text(fd, "telefon", 50), email: text(fd, "email") };
  const arzt = id
    ? await db.doctor.update({ where: { id }, data: daten })
    : await db.doctor.create({ data: daten });
  await protokolliere(sitzung.user.id, "Doctor", arzt.id, id ? "AENDERN" : "ANLEGEN");
  revalidatePath("/einstellungen/stammdaten");
}

export async function arztLoeschen(id: string): Promise<void> {
  const sitzung = await admin();
  await db.doctor.update({ where: { id }, data: { geloeschtAm: new Date() } });
  await protokolliere(sitzung.user.id, "Doctor", id, "LOESCHEN");
  revalidatePath("/einstellungen/stammdaten");
}

export async function pflegedienstSpeichern(id: string | null, fd: FormData): Promise<void> {
  const sitzung = await admin();
  const name = text(fd, "name");
  if (!name) return;
  const daten = { name, ansprechpartner: text(fd, "ansprechpartner"), telefon: text(fd, "telefon", 50), email: text(fd, "email") };
  const dienst = id
    ? await db.careService.update({ where: { id }, data: daten })
    : await db.careService.create({ data: daten });
  await protokolliere(sitzung.user.id, "CareService", dienst.id, id ? "AENDERN" : "ANLEGEN");
  revalidatePath("/einstellungen/stammdaten");
}

export async function pflegedienstLoeschen(id: string): Promise<void> {
  const sitzung = await admin();
  await db.careService.update({ where: { id }, data: { geloeschtAm: new Date() } });
  await protokolliere(sitzung.user.id, "CareService", id, "LOESCHEN");
  revalidatePath("/einstellungen/stammdaten");
}
