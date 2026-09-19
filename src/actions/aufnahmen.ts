"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import {
  aufnahmeAusFormData,
  aufnahmeZuDatensatz,
} from "@/lib/schema/aufnahme-formdata";
import type { FormZustand } from "./patienten";

function zuFehlern(issues: { path: (string | number)[]; message: string }[]) {
  const fehler: Record<string, string> = {};
  for (const i of issues) {
    const feld = String(i.path[0] ?? "_");
    if (!fehler[feld]) fehler[feld] = i.message;
  }
  return fehler;
}

export async function aufnahmeAnlegen(
  wundeId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = aufnahmeAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues) };
  }

  const wunde = await db.wound.findUnique({
    where: { id: wundeId },
    include: { _count: { select: { aufnahmen: { where: { geloeschtAm: null } } } } },
  });
  if (!wunde || wunde.geloeschtAm) {
    return { meldung: "Diese Wunde existiert nicht mehr." };
  }

  // Die erste Aufnahme einer Wunde ist die Erstaufnahme - das leitet sich aus
  // dem Bestand ab und wird nicht vom Formular bestimmt.
  const typ = wunde._count.aufnahmen === 0 ? "ERSTAUFNAHME" : "FOLGEAUFNAHME";
  const entwurfId = String(fd.get("entwurfId") ?? "");

  let aufnahmeId: string;

  if (entwurfId) {
    // Der Autosave hat bereits einen Entwurf angelegt - den fertigstellen,
    // statt einen zweiten Datensatz zu erzeugen.
    const aktualisiert = await db.assessment.update({
      where: { id: entwurfId },
      data: {
        ...aufnahmeZuDatensatz(geprueft.data),
        typ,
        istEntwurf: false,
        erstelltVonId: sitzung.user.id,
      },
    });
    aufnahmeId = aktualisiert.id;
  } else {
    const neu = await db.assessment.create({
      data: {
        ...aufnahmeZuDatensatz(geprueft.data),
        woundId: wundeId,
        typ,
        istEntwurf: false,
        erstelltVonId: sitzung.user.id,
      },
    });
    aufnahmeId = neu.id;
  }

  await protokolliere(sitzung.user.id, "Assessment", aufnahmeId, "ANLEGEN", typ);

  revalidatePath(`/wunden/${wundeId}`);
  revalidatePath(`/patienten/${wunde.patientId}`);
  redirect(`/aufnahmen/${aufnahmeId}`);
}

export async function aufnahmeAendern(
  aufnahmeId: string,
  _zustand: FormZustand,
  fd: FormData,
): Promise<FormZustand> {
  const sitzung = await verlangeSitzung();
  const geprueft = aufnahmeAusFormData(fd);

  if (!geprueft.success) {
    return { fehler: zuFehlern(geprueft.error.issues) };
  }

  const vorher = await db.assessment.findUnique({ where: { id: aufnahmeId } });
  if (!vorher || vorher.geloeschtAm) {
    return { meldung: "Diese Aufnahme existiert nicht mehr." };
  }

  const daten = aufnahmeZuDatensatz(geprueft.data);
  await db.assessment.update({
    where: { id: aufnahmeId },
    data: { ...daten, istEntwurf: false },
  });

  await protokolliere(
    sitzung.user.id,
    "Assessment",
    aufnahmeId,
    "AENDERN",
    geaenderteFelder(vorher, daten),
  );

  revalidatePath(`/wunden/${vorher.woundId}`);
  revalidatePath(`/aufnahmen/${aufnahmeId}`);
  redirect(`/aufnahmen/${aufnahmeId}`);
}

/**
 * Zwischenspeichern waehrend des Ausfuellens.
 *
 * Laeuft bewusst ohne Validierung: Ein halb ausgefuelltes Formular soll
 * gesichert werden koennen, auch wenn die Pflichtangaben noch fehlen. Erst
 * beim Absenden wird geprueft.
 *
 * Gibt die Id des Entwurfs zurueck, damit der naechste Aufruf denselben
 * Datensatz trifft.
 */
export async function entwurfSpeichern(
  wundeId: string,
  entwurfId: string | null,
  rohdaten: Record<string, unknown>,
): Promise<{ entwurfId: string; zeitpunkt: string } | { fehler: string }> {
  const sitzung = await verlangeSitzung();

  const wunde = await db.wound.findUnique({ where: { id: wundeId } });
  if (!wunde || wunde.geloeschtAm) return { fehler: "Wunde nicht gefunden" };

  // Nur die Felder uebernehmen, die sich sicher ablegen lassen; alles andere
  // wird beim Absenden ohnehin geprueft.
  const datum =
    typeof rohdaten.datum === "string" && rohdaten.datum
      ? new Date(rohdaten.datum)
      : new Date();

  const daten = {
    datum: Number.isNaN(datum.getTime()) ? new Date() : datum,
    anmerkungen: typeof rohdaten.anmerkungen === "string" ? rohdaten.anmerkungen : null,
    istEntwurf: true,
    erstelltVonId: sitzung.user.id,
  };

  if (entwurfId) {
    const bestehend = await db.assessment.findUnique({ where: { id: entwurfId } });
    if (bestehend?.istEntwurf) {
      await db.assessment.update({ where: { id: entwurfId }, data: daten });
      return { entwurfId, zeitpunkt: new Date().toISOString() };
    }
  }

  const neu = await db.assessment.create({
    data: { ...daten, woundId: wundeId, typ: "FOLGEAUFNAHME" },
  });
  return { entwurfId: neu.id, zeitpunkt: new Date().toISOString() };
}

export async function aufnahmeLoeschen(aufnahmeId: string): Promise<void> {
  const sitzung = await verlangeSitzung();

  const aufnahme = await db.assessment.update({
    where: { id: aufnahmeId },
    data: { geloeschtAm: new Date() },
  });
  await protokolliere(sitzung.user.id, "Assessment", aufnahmeId, "LOESCHEN");

  revalidatePath(`/wunden/${aufnahme.woundId}`);
  redirect(`/wunden/${aufnahme.woundId}`);
}
