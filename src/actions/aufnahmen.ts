"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { geaenderteFelder, protokolliere } from "@/lib/audit";
import { statuswechsel } from "@/lib/wundstatus";
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

  const daten = aufnahmeZuDatensatz(geprueft.data);
  // Eine neue Folgeaufnahme auf einer bereits abgeschlossenen Wunde eröffnet
  // sie wieder - dokumentiert wird ja weiterbehandelt.
  const wechsel = statuswechsel(
    geprueft.data.wundeGeheilt,
    geprueft.data.datum,
    wunde.abgeschlossenAm !== null,
  );

  // Aufnahme und Wundstatus gemeinsam, damit keine gespeicherte Abheilung ohne
  // abgeschlossene Wunde zurückbleibt.
  const aufnahmeId = await db.$transaction(async (tx) => {
    let id: string;

    if (entwurfId) {
      // Der Autosave hat bereits einen Entwurf angelegt - den fertigstellen,
      // statt einen zweiten Datensatz zu erzeugen. Die Wund-ID wird mitgeprüft,
      // damit eine manipulierte versteckte ID keine fremde Aufnahme überschreibt.
      const entwurf = await tx.assessment.findFirst({
        where: { id: entwurfId, woundId: wundeId, istEntwurf: true, geloeschtAm: null },
      });
      if (entwurf) {
        const aktualisiert = await tx.assessment.update({
          where: { id: entwurf.id },
          data: { ...daten, typ, istEntwurf: false, erstelltVonId: sitzung.user.id },
        });
        id = aktualisiert.id;
      } else {
        const neu = await tx.assessment.create({
          data: {
            ...daten,
            woundId: wundeId,
            typ,
            istEntwurf: false,
            erstelltVonId: sitzung.user.id,
          },
        });
        id = neu.id;
      }
    } else {
      const neu = await tx.assessment.create({
        data: {
          ...daten,
          woundId: wundeId,
          typ,
          istEntwurf: false,
          erstelltVonId: sitzung.user.id,
        },
      });
      id = neu.id;
    }

    if (wechsel) {
      await tx.wound.update({
        where: { id: wundeId },
        data: { abgeschlossenAm: wechsel.abgeschlossenAm },
      });
    }

    return id;
  });

  await protokolliere(sitzung.user.id, "Assessment", aufnahmeId, "ANLEGEN", typ);
  if (wechsel) {
    await protokolliere(sitzung.user.id, "Wound", wundeId, "AENDERN", wechsel.protokoll);
  }

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

  const vorher = await db.assessment.findUnique({
    where: { id: aufnahmeId },
    include: { wunde: { select: { patientId: true } } },
  });
  if (!vorher || vorher.geloeschtAm) {
    return { meldung: "Diese Aufnahme existiert nicht mehr." };
  }

  const daten = aufnahmeZuDatensatz(geprueft.data);
  // Wiedereröffnen nur, wenn genau diese Aufnahme die Wunde geschlossen hatte.
  // Sonst würde das Korrigieren einer alten Aufnahme eine später abgeheilte
  // Wunde unbemerkt wieder öffnen.
  const wechsel = statuswechsel(
    geprueft.data.wundeGeheilt,
    geprueft.data.datum,
    vorher.wundeGeheilt,
  );

  await db.$transaction(async (tx) => {
    await tx.assessment.update({
      where: { id: aufnahmeId },
      data: { ...daten, istEntwurf: false },
    });
    if (wechsel) {
      await tx.wound.update({
        where: { id: vorher.woundId },
        data: { abgeschlossenAm: wechsel.abgeschlossenAm },
      });
    }
  });

  await protokolliere(
    sitzung.user.id,
    "Assessment",
    aufnahmeId,
    "AENDERN",
    geaenderteFelder(vorher, daten),
  );
  if (wechsel) {
    await protokolliere(sitzung.user.id, "Wound", vorher.woundId, "AENDERN", wechsel.protokoll);
  }

  revalidatePath(`/wunden/${vorher.woundId}`);
  revalidatePath(`/patienten/${vorher.wunde.patientId}`);
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
    const bestehend = await db.assessment.findFirst({
      where: { id: entwurfId, woundId: wundeId, istEntwurf: true, geloeschtAm: null },
    });
    if (bestehend) {
      await db.assessment.update({ where: { id: entwurfId }, data: daten });
      return { entwurfId, zeitpunkt: new Date().toISOString() };
    }
  }

  const anzahl = await db.assessment.count({
    where: { woundId: wundeId, geloeschtAm: null, istEntwurf: false },
  });
  const neu = await db.assessment.create({
    data: {
      ...daten,
      woundId: wundeId,
      typ: anzahl === 0 ? "ERSTAUFNAHME" : "FOLGEAUFNAHME",
    },
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
