"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verlangeAdmin, verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { wundeAusFormData, type WundeEingabe } from "@/lib/schema/wunde";
import {
  VersorgungspartnerFehler,
  versorgungspartnerAufloesen,
} from "@/lib/versorgungspartner-server";
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

function wundDaten(
  eingabe: WundeEingabe,
  kontakte: Awaited<ReturnType<typeof versorgungspartnerAufloesen>>,
) {
  const {
    neuerArztName,
    neueArztPraxis,
    neuerPflegedienstName,
    neuerPflegedienstAnsprechpartner,
    ...daten
  } = eingabe;
  // Diese vier Werte dienen nur der optionalen Stammdaten-Neuanlage und sind
  // keine Spalten der Wunde.
  void neuerArztName;
  void neueArztPraxis;
  void neuerPflegedienstName;
  void neuerPflegedienstAnsprechpartner;
  return {
    ...daten,
    arztId: kontakte.arztId,
    pflegedienstId: kontakte.pflegedienstId,
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

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.geloeschtAm) {
    return { meldung: "Dieser Patient existiert nicht mehr." };
  }

  const transaktion = () =>
    db.$transaction(async (tx) => {
      const kontakte = await versorgungspartnerAufloesen(tx, geprueft.data, {
        arztPflicht: false,
      });
      const wunde = await tx.wound.create({
        data: { ...wundDaten(geprueft.data, kontakte), patientId },
      });
      return { wunde, kontakte };
    });

  let ergebnis: Awaited<ReturnType<typeof transaktion>>;
  try {
    ergebnis = await transaktion();
  } catch (fehler) {
    if (fehler instanceof VersorgungspartnerFehler) {
      return { fehler: { [fehler.feld]: fehler.message }, werte: werteAus(fd) };
    }
    throw fehler;
  }

  const { wunde, kontakte } = ergebnis;
  await protokolliere(sitzung.user.id, "Wound", wunde.id, "ANLEGEN");
  if (kontakte.neuerArztId) {
    await protokolliere(sitzung.user.id, "Doctor", kontakte.neuerArztId, "ANLEGEN");
  }
  if (kontakte.neuerPflegedienstId) {
    await protokolliere(
      sitzung.user.id,
      "CareService",
      kontakte.neuerPflegedienstId,
      "ANLEGEN",
    );
  }

  revalidatePath(`/patienten/${patientId}`);
  if (kontakte.neuerArztId || kontakte.neuerPflegedienstId) {
    revalidatePath("/einstellungen/stammdaten");
  }
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

  const vorher = await db.wound.findUnique({ where: { id: wundeId } });
  if (!vorher || vorher.geloeschtAm) {
    return { meldung: "Diese Wunde existiert nicht mehr." };
  }

  const transaktion = () =>
    db.$transaction(async (tx) => {
      const kontakte = await versorgungspartnerAufloesen(tx, geprueft.data, {
        arztPflicht: false,
      });
      const daten = wundDaten(geprueft.data, kontakte);
      await tx.wound.update({ where: { id: wundeId }, data: daten });
      return { kontakte, daten };
    });

  let ergebnis: Awaited<ReturnType<typeof transaktion>>;
  try {
    ergebnis = await transaktion();
  } catch (fehler) {
    if (fehler instanceof VersorgungspartnerFehler) {
      return { fehler: { [fehler.feld]: fehler.message }, werte: werteAus(fd) };
    }
    throw fehler;
  }

  const { kontakte, daten } = ergebnis;
  await protokolliere(
    sitzung.user.id,
    "Wound",
    wundeId,
    "AENDERN",
    geaenderteFelder(vorher, daten),
  );
  if (kontakte.neuerArztId) {
    await protokolliere(sitzung.user.id, "Doctor", kontakte.neuerArztId, "ANLEGEN");
  }
  if (kontakte.neuerPflegedienstId) {
    await protokolliere(
      sitzung.user.id,
      "CareService",
      kontakte.neuerPflegedienstId,
      "ANLEGEN",
    );
  }

  revalidatePath(`/patienten/${vorher.patientId}`);
  revalidatePath(`/wunden/${wundeId}`);
  if (kontakte.neuerArztId || kontakte.neuerPflegedienstId) {
    revalidatePath("/einstellungen/stammdaten");
  }
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
export async function wundeLoeschen(wundeId: string): Promise<void> {
  const sitzung = await verlangeAdmin();

  const wunde = await db.wound.update({
    where: { id: wundeId },
    data: { geloeschtAm: new Date() },
  });
  await protokolliere(sitzung.user.id, "Wound", wundeId, "LOESCHEN");

  revalidatePath(`/patienten/${wunde.patientId}`);
  redirect(`/patienten/${wunde.patientId}`);
}
