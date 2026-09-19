"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { wundeAusFormData } from "@/lib/schema/wunde";
import type { FormZustand } from "./patienten";

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

async function stammdatenFehler(arztId: string | null, pflegedienstId: string | null) {
  const [arzt, pflegedienst] = await Promise.all([
    arztId ? db.doctor.findFirst({ where: { id: arztId, geloeschtAm: null }, select: { id: true } }) : null,
    pflegedienstId ? db.careService.findFirst({ where: { id: pflegedienstId, geloeschtAm: null }, select: { id: true } }) : null,
  ]);
  return {
    ...(arztId && !arzt ? { arztId: "Der ausgewählte Arzt ist nicht verfügbar" } : {}),
    ...(pflegedienstId && !pflegedienst ? { pflegedienstId: "Der ausgewählte Pflegedienst ist nicht verfügbar" } : {}),
  };
}

export async function wundeAnlegen(
  patientId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = wundeAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues), werte: werteAus(fd) };
  }
  const auswahlFehler = await stammdatenFehler(geprueft.data.arztId, geprueft.data.pflegedienstId);
  if (Object.keys(auswahlFehler).length) return { fehler: auswahlFehler, werte: werteAus(fd) };

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.geloeschtAm) {
    return { meldung: "Dieser Patient existiert nicht mehr." };
  }

  const wunde = await db.wound.create({
    data: { ...geprueft.data, patientId },
  });
  await protokolliere(sitzung.user.id, "Wound", wunde.id, "ANLEGEN");

  revalidatePath(`/patienten/${patientId}`);
  redirect(`/wunden/${wunde.id}`);
}

export async function wundeAendern(
  wundeId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = wundeAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues), werte: werteAus(fd) };
  }
  const auswahlFehler = await stammdatenFehler(geprueft.data.arztId, geprueft.data.pflegedienstId);
  if (Object.keys(auswahlFehler).length) return { fehler: auswahlFehler, werte: werteAus(fd) };

  const vorher = await db.wound.findUnique({ where: { id: wundeId } });
  if (!vorher || vorher.geloeschtAm) {
    return { meldung: "Diese Wunde existiert nicht mehr." };
  }

  await db.wound.update({ where: { id: wundeId }, data: geprueft.data });
  await protokolliere(
    sitzung.user.id,
    "Wound",
    wundeId,
    "AENDERN",
    geaenderteFelder(vorher, geprueft.data),
  );

  revalidatePath(`/patienten/${vorher.patientId}`);
  revalidatePath(`/wunden/${wundeId}`);
  redirect(`/wunden/${wundeId}`);
}

/**
 * Wunde als abgeheilt markieren.
 *
 * Kein Loeschen: Die Wunde bleibt mit ihrem gesamten Verlauf einsehbar, taucht
 * aber nicht mehr unter den offenen Wunden auf.
 */
export async function wundeAbschliessen(wundeId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  const wunde = await db.wound.update({
    where: { id: wundeId },
    data: { abgeschlossenAm: new Date() },
  });
  await protokolliere(sitzung.user.id, "Wound", wundeId, "AENDERN", "abgeschlossen");

  revalidatePath(`/patienten/${wunde.patientId}`);
  revalidatePath(`/wunden/${wundeId}`);
}

export async function wundeWiedereroeffnen(wundeId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  const wunde = await db.wound.update({
    where: { id: wundeId },
    data: { abgeschlossenAm: null },
  });
  await protokolliere(sitzung.user.id, "Wound", wundeId, "AENDERN", "wiedereröffnet");

  revalidatePath(`/patienten/${wunde.patientId}`);
  revalidatePath(`/wunden/${wundeId}`);
}

/**
 * Merkt sich pro Benutzer, ob die Lokalisation über die Körperkarte (mit
 * vorgegebenen Markierungen) oder frei einzeichenbar angezeigt werden soll.
 * Reine Anzeige-Vorliebe, kein Wunddatum - deshalb kein Audit-Eintrag.
 */
export async function lokalisationsAnzeigeSetzen(modus: string): Promise<void> {
  const sitzung = await verlangeSitzung();
  if (modus !== "KARTE" && modus !== "FREIHAND") return;
  await db.user.update({
    where: { id: sitzung.user.id },
    data: { lokalisationsAnzeige: modus },
  });
}

export async function wundeLoeschen(wundeId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  const wunde = await db.wound.update({
    where: { id: wundeId },
    data: { geloeschtAm: new Date() },
  });
  await protokolliere(sitzung.user.id, "Wound", wundeId, "LOESCHEN");

  revalidatePath(`/patienten/${wunde.patientId}`);
  redirect(`/patienten/${wunde.patientId}`);
}
