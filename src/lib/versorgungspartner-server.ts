import type { Prisma } from "@prisma/client";
import { NEUER_STAMMDATENSATZ } from "@/lib/versorgungspartner";

export type VersorgungspartnerEingabe = {
  arztId: string | null;
  neuerArztName: string | null;
  neueArztPraxis: string | null;
  pflegedienstId: string | null;
  neuerPflegedienstName: string | null;
  neuerPflegedienstAnsprechpartner: string | null;
};

export class VersorgungspartnerFehler extends Error {
  constructor(public feld: string, meldung: string) {
    super(meldung);
  }
}

/**
 * Prueft vorhandene Versorgungspartner oder legt neue zentrale Stammdaten an.
 * Der Aufrufer gibt dieselbe Transaktion weiter, in der Patient/Wunde gespeichert wird.
 */
export async function versorgungspartnerAufloesen(
  tx: Prisma.TransactionClient,
  eingabe: VersorgungspartnerEingabe,
  { arztPflicht }: { arztPflicht: boolean },
) {
  let arztId = eingabe.arztId;
  let arztName: string | null = null;
  let neuerArztId: string | null = null;

  if (arztId === NEUER_STAMMDATENSATZ) {
    if (!eingabe.neuerArztName) {
      throw new VersorgungspartnerFehler(
        "neuerArztName",
        "Bitte den Namen des neuen Arztes angeben",
      );
    }
    const arzt = await tx.doctor.create({
      data: { name: eingabe.neuerArztName, praxis: eingabe.neueArztPraxis },
    });
    arztId = arzt.id;
    arztName = arzt.name;
    neuerArztId = arzt.id;
  } else if (arztId) {
    const arzt = await tx.doctor.findFirst({
      where: { id: arztId, geloeschtAm: null },
      select: { id: true, name: true },
    });
    if (!arzt) {
      throw new VersorgungspartnerFehler(
        "arztId",
        "Der ausgewählte Arzt ist nicht verfügbar",
      );
    }
    arztName = arzt.name;
  } else if (arztPflicht) {
    throw new VersorgungspartnerFehler("arztId", "Bitte einen Arzt auswählen");
  }

  let pflegedienstId = eingabe.pflegedienstId;
  let neuerPflegedienstId: string | null = null;

  if (pflegedienstId === NEUER_STAMMDATENSATZ) {
    if (!eingabe.neuerPflegedienstName) {
      throw new VersorgungspartnerFehler(
        "neuerPflegedienstName",
        "Bitte den Namen des neuen Pflegedienstes angeben",
      );
    }
    const dienst = await tx.careService.create({
      data: {
        name: eingabe.neuerPflegedienstName,
        ansprechpartner: eingabe.neuerPflegedienstAnsprechpartner,
      },
    });
    pflegedienstId = dienst.id;
    neuerPflegedienstId = dienst.id;
  } else if (pflegedienstId) {
    const dienst = await tx.careService.findFirst({
      where: { id: pflegedienstId, geloeschtAm: null },
      select: { id: true },
    });
    if (!dienst) {
      throw new VersorgungspartnerFehler(
        "pflegedienstId",
        "Der ausgewählte Pflegedienst ist nicht verfügbar",
      );
    }
  }

  return {
    arztId,
    arztName,
    pflegedienstId,
    neuerArztId,
    neuerPflegedienstId,
  };
}
