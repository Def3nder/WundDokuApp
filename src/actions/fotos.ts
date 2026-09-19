"use server";

import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { protokolliere } from "@/lib/audit";
import {
  FotoFehler,
  bereinigeDateiname,
  loescheFotoDatei,
  neueFotoPfade,
  speichereFoto,
  verarbeiteBild,
} from "@/lib/fotos";
import { fotoZuAnsicht, type FotoAnsicht } from "@/lib/foto-typen";
import { FOTO_MAX_BYTES } from "@/lib/foto-typen";
import { revalidatePath } from "next/cache";

export type FotoErgebnis =
  | { erfolg: true; fotos: FotoAnsicht[] }
  | { erfolg: false; fehler: string };

const MAX_DATEIEN_PRO_UPLOAD = 8;
const BESCHREIBUNG_MAX = 500;

function beschreibung(wert: FormDataEntryValue | null): string | null {
  if (typeof wert !== "string") return null;
  const bereinigt = wert.trim();
  if (!bereinigt) return null;
  if (bereinigt.length > BESCHREIBUNG_MAX) {
    throw new FotoFehler(`Eine Fotobeschreibung darf höchstens ${BESCHREIBUNG_MAX} Zeichen haben.`);
  }
  return bereinigt;
}

async function aktiveAufnahme(aufnahmeId: string) {
  return db.assessment.findFirst({
    where: {
      id: aufnahmeId,
      geloeschtAm: null,
      wunde: { geloeschtAm: null, patient: { geloeschtAm: null } },
    },
    include: { wunde: { select: { id: true, patientId: true } } },
  });
}

export async function fotosHochladen(
  aufnahmeId: string,
  fd: FormData,
): Promise<FotoErgebnis> {
  const sitzung = await verlangeSitzung();
  const aufnahme = await aktiveAufnahme(aufnahmeId);
  if (!aufnahme) return { erfolg: false, fehler: "Aufnahme nicht gefunden." };

  const dateien = fd.getAll("fotos").filter((wert): wert is File => wert instanceof File);
  const beschreibungen = fd.getAll("beschreibungen");
  if (dateien.length === 0) return { erfolg: false, fehler: "Bitte mindestens ein Foto auswählen." };
  if (dateien.length > MAX_DATEIEN_PRO_UPLOAD) {
    return { erfolg: false, fehler: `Pro Upload sind höchstens ${MAX_DATEIEN_PRO_UPLOAD} Fotos möglich.` };
  }

  const vorbereitete: Array<{
    dateiname: string;
    beschreibung: string | null;
    foto: Awaited<ReturnType<typeof verarbeiteBild>>;
  }> = [];

  try {
    for (const [index, datei] of dateien.entries()) {
      if (datei.size > FOTO_MAX_BYTES) throw new FotoFehler(`${datei.name}: höchstens 15 MB erlaubt.`);
      const daten = Buffer.from(await datei.arrayBuffer());
      vorbereitete.push({
        dateiname: bereinigeDateiname(datei.name),
        beschreibung: beschreibung(beschreibungen[index] ?? null),
        foto: await verarbeiteBild(daten),
      });
    }
  } catch (fehler) {
    return {
      erfolg: false,
      fehler: fehler instanceof FotoFehler ? fehler.message : "Die Fotos konnten nicht verarbeitet werden.",
    };
  }

  const letztes = await db.photo.aggregate({
    where: { assessmentId: aufnahmeId, geloeschtAm: null },
    _max: { reihenfolge: true },
  });
  const angelegtePfade: Array<{ pfad: string; thumbnailPfad: string }> = [];

  try {
    const daten = [];
    for (const [index, eintrag] of vorbereitete.entries()) {
      const pfade = neueFotoPfade(aufnahme.wunde.patientId, aufnahme.wunde.id);
      await speichereFoto(pfade.pfad, pfade.thumbnailPfad, eintrag.foto);
      angelegtePfade.push(pfade);
      daten.push({
        assessmentId: aufnahmeId,
        dateiname: eintrag.dateiname,
        pfad: pfade.pfad,
        thumbnailPfad: pfade.thumbnailPfad,
        breite: eintrag.foto.breite,
        hoehe: eintrag.foto.hoehe,
        mimeType: eintrag.foto.mimeType,
        groesseBytes: eintrag.foto.bild.length,
        beschreibung: eintrag.beschreibung,
        reihenfolge: (letztes._max.reihenfolge ?? -1) + index + 1,
      });
    }

    await db.photo.createMany({ data: daten });
  } catch (fehler) {
    await Promise.allSettled(
      angelegtePfade.flatMap((p) => [loescheFotoDatei(p.pfad), loescheFotoDatei(p.thumbnailPfad)]),
    );
    console.error("Fotoablage fehlgeschlagen:", fehler);
    return { erfolg: false, fehler: "Die Fotos konnten nicht gespeichert werden." };
  }

  const fotos = await db.photo.findMany({
    where: { assessmentId: aufnahmeId, geloeschtAm: null },
    orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }],
  });
  await protokolliere(
    sitzung.user.id,
    "Assessment",
    aufnahmeId,
    "AENDERN",
    `${vorbereitete.length} Foto(s) hinzugefügt`,
  );
  revalidatePath(`/aufnahmen/${aufnahmeId}`);
  revalidatePath(`/wunden/${aufnahme.woundId}`);
  return { erfolg: true, fotos: fotos.map(fotoZuAnsicht) };
}

export async function fotoBeschreibungAendern(
  fotoId: string,
  wert: string,
): Promise<{ erfolg: true } | { erfolg: false; fehler: string }> {
  const sitzung = await verlangeSitzung();
  const foto = await db.photo.findUnique({
    where: { id: fotoId },
    include: {
      aufnahme: {
        select: {
          id: true,
          woundId: true,
          geloeschtAm: true,
          wunde: { select: { geloeschtAm: true, patient: { select: { geloeschtAm: true } } } },
        },
      },
    },
  });
  if (
    !foto ||
    foto.geloeschtAm ||
    foto.aufnahme.geloeschtAm ||
    foto.aufnahme.wunde.geloeschtAm ||
    foto.aufnahme.wunde.patient.geloeschtAm
  ) return { erfolg: false, fehler: "Foto nicht gefunden." };
  if (wert.trim().length > BESCHREIBUNG_MAX) {
    return { erfolg: false, fehler: `Die Beschreibung darf höchstens ${BESCHREIBUNG_MAX} Zeichen haben.` };
  }

  await db.photo.update({
    where: { id: fotoId },
    data: { beschreibung: wert.trim() || null },
  });
  await protokolliere(sitzung.user.id, "Photo", fotoId, "AENDERN", "beschreibung");
  revalidatePath(`/aufnahmen/${foto.aufnahme.id}`);
  return { erfolg: true };
}

export async function fotosSortieren(
  aufnahmeId: string,
  fotoIds: string[],
): Promise<{ erfolg: true } | { erfolg: false; fehler: string }> {
  const sitzung = await verlangeSitzung();
  const aufnahme = await aktiveAufnahme(aufnahmeId);
  if (!aufnahme) return { erfolg: false, fehler: "Aufnahme nicht gefunden." };

  const vorhanden = await db.photo.findMany({
    where: { assessmentId: aufnahmeId, geloeschtAm: null },
    select: { id: true },
  });
  const erwartet = new Set(vorhanden.map((foto) => foto.id));
  if (fotoIds.length !== erwartet.size || new Set(fotoIds).size !== fotoIds.length || fotoIds.some((id) => !erwartet.has(id))) {
    return { erfolg: false, fehler: "Die Fotoreihenfolge ist unvollständig." };
  }

  await db.$transaction(
    fotoIds.map((id, reihenfolge) => db.photo.update({ where: { id }, data: { reihenfolge } })),
  );
  await protokolliere(sitzung.user.id, "Assessment", aufnahmeId, "AENDERN", "Fotoreihenfolge");
  revalidatePath(`/aufnahmen/${aufnahmeId}`);
  return { erfolg: true };
}

export async function fotoLoeschen(
  fotoId: string,
): Promise<{ erfolg: true } | { erfolg: false; fehler: string }> {
  const sitzung = await verlangeSitzung();
  const foto = await db.photo.findUnique({
    where: { id: fotoId },
    include: {
      aufnahme: {
        select: {
          id: true,
          woundId: true,
          geloeschtAm: true,
          wunde: { select: { geloeschtAm: true, patient: { select: { geloeschtAm: true } } } },
        },
      },
    },
  });
  if (
    !foto ||
    foto.geloeschtAm ||
    foto.aufnahme.geloeschtAm ||
    foto.aufnahme.wunde.geloeschtAm ||
    foto.aufnahme.wunde.patient.geloeschtAm
  ) return { erfolg: false, fehler: "Foto nicht gefunden." };

  await db.photo.update({ where: { id: fotoId }, data: { geloeschtAm: new Date() } });
  await protokolliere(sitzung.user.id, "Photo", fotoId, "LOESCHEN");
  revalidatePath(`/aufnahmen/${foto.aufnahme.id}`);
  revalidatePath(`/wunden/${foto.aufnahme.woundId}`);
  return { erfolg: true };
}
