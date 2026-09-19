"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { protokolliere } from "@/lib/audit";
import {
  bereinigeDokumentDateiname,
  DokumentFehler,
  loescheDokumentDatei,
  speichereDokument,
} from "@/lib/dokumente";

export type DokumentZustand = { erfolg?: boolean; meldung?: string };

export async function dokumentHochladen(
  patientId: string,
  _zustand: DokumentZustand,
  fd: FormData,
): Promise<DokumentZustand> {
  const sitzung = await verlangeSitzung();
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.geloeschtAm) return { meldung: "Patient nicht gefunden." };

  const typ = String(fd.get("typ") ?? "");
  const titel = String(fd.get("titel") ?? "").trim();
  const datei = fd.get("datei");
  if (typ !== "REZEPT" && typ !== "ARZTBRIEF") return { meldung: "Bitte eine Dokumentart auswählen." };
  if (!titel || titel.length > 150) return { meldung: "Bitte einen Titel mit höchstens 150 Zeichen angeben." };
  if (!(datei instanceof File) || datei.size === 0) return { meldung: "Bitte eine Datei auswählen." };

  let gespeichert: Awaited<ReturnType<typeof speichereDokument>>;
  try {
    gespeichert = await speichereDokument(patientId, Buffer.from(await datei.arrayBuffer()));
  } catch (fehler) {
    return { meldung: fehler instanceof DokumentFehler ? fehler.message : "Das Dokument konnte nicht gespeichert werden." };
  }

  try {
    const dokument = await db.patientDocument.create({
      data: {
        patientId,
        hochgeladenVonId: sitzung.user.id,
        typ,
        titel,
        dateiname: bereinigeDokumentDateiname(datei.name),
        ...gespeichert,
      },
    });
    await protokolliere(sitzung.user.id, "PatientDocument", dokument.id, "ANLEGEN", typ);
  } catch (fehler) {
    await loescheDokumentDatei(gespeichert.pfad);
    console.error("Dokumentablage fehlgeschlagen:", fehler);
    return { meldung: "Das Dokument konnte nicht gespeichert werden." };
  }

  revalidatePath(`/patienten/${patientId}`);
  redirect(`/patienten/${patientId}/dokumente?typ=${typ}`);
}

export async function dokumentLoeschen(dokumentId: string): Promise<void> {
  const sitzung = await verlangeSitzung();
  const dokument = await db.patientDocument.findUnique({ where: { id: dokumentId } });
  if (!dokument || dokument.geloeschtAm) return;
  await db.patientDocument.update({ where: { id: dokumentId }, data: { geloeschtAm: new Date() } });
  await protokolliere(sitzung.user.id, "PatientDocument", dokumentId, "LOESCHEN", dokument.typ);
  revalidatePath(`/patienten/${dokument.patientId}`);
  revalidatePath(`/patienten/${dokument.patientId}/dokumente`);
}
