"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verlangeSitzung } from "@/lib/auth";
import { db } from "@/lib/db";
import { bucheArbeitszeit, entferneArbeitszeit, speichereZeitVorgabe, zeitFehlermeldung } from "@/lib/arbeitszeit-server";
import { zeitBuchungSchema, zeitVorgabeSchema, type ZeitErgebnis } from "@/lib/schema/arbeitszeit";

export async function arbeitszeitSpeichern(fd: FormData): Promise<ZeitErgebnis> {
  const sitzung = await verlangeSitzung();
  const geprueft = zeitBuchungSchema.safeParse(Object.fromEntries(fd));
  if (!geprueft.success) return { fehler: Object.fromEntries(geprueft.error.issues.map((e) => [e.path[0], e.message])) };
  try {
    await bucheArbeitszeit(db, sitzung.user.id, geprueft.data);
  } catch (fehler) { return { meldung: zeitFehlermeldung(fehler) }; }
  revalidatePath("/zeiterfassung");
  return { ok: true };
}

export async function arbeitszeitLoeschen(fd: FormData): Promise<ZeitErgebnis> {
  const sitzung = await verlangeSitzung();
  const geprueft = z.object({ id: z.string().min(1).max(100), version: z.coerce.number().int().min(0) }).safeParse(Object.fromEntries(fd));
  if (!geprueft.success) return { meldung: "Ungültiger Zeiteintrag" };
  try {
    await entferneArbeitszeit(db, sitzung.user.id, geprueft.data.id, geprueft.data.version);
  } catch (fehler) { return { meldung: zeitFehlermeldung(fehler) }; }
  revalidatePath("/zeiterfassung");
  return { ok: true };
}

export async function arbeitszeitVorgabeSpeichern(fd: FormData): Promise<ZeitErgebnis> {
  const sitzung = await verlangeSitzung();
  const geprueft = zeitVorgabeSchema.safeParse({ ...Object.fromEntries(fd), arbeitstage: fd.getAll("arbeitstage") });
  if (!geprueft.success) return { fehler: Object.fromEntries(geprueft.error.issues.map((e) => [e.path[0], e.message])) };
  try {
    await speichereZeitVorgabe(db, sitzung.user.id, geprueft.data);
  } catch (fehler) { return { meldung: zeitFehlermeldung(fehler) }; }
  revalidatePath("/zeiterfassung");
  revalidatePath("/zeiterfassung/einstellungen");
  return { ok: true };
}
