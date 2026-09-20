import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { NEUER_STAMMDATENSATZ } from "./versorgungspartner";
import {
  VersorgungspartnerFehler,
  versorgungspartnerAufloesen,
} from "./versorgungspartner-server";

function transaktion() {
  const doctor = {
    create: vi.fn(),
    findFirst: vi.fn(),
  };
  const careService = {
    create: vi.fn(),
    findFirst: vi.fn(),
  };
  return {
    tx: { doctor, careService } as unknown as Prisma.TransactionClient,
    doctor,
    careService,
  };
}

describe("versorgungspartnerAufloesen", () => {
  it("legt neue zentrale Versorgungspartner an und liefert ihre IDs", async () => {
    const { tx, doctor, careService } = transaktion();
    doctor.create.mockResolvedValue({ id: "arzt-neu", name: "Prof. Dr. Anna Meier" });
    careService.create.mockResolvedValue({ id: "pflege-neu", name: "Pflege Nord" });

    const ergebnis = await versorgungspartnerAufloesen(
      tx,
      {
        arztId: NEUER_STAMMDATENSATZ,
        neuerArztName: "Prof. Dr. Anna Meier",
        neueArztPraxis: "Praxis am Park",
        pflegedienstId: NEUER_STAMMDATENSATZ,
        neuerPflegedienstName: "Pflege Nord",
        neuerPflegedienstAnsprechpartner: "Lena Sommer",
      },
      { arztPflicht: false },
    );

    expect(ergebnis).toMatchObject({
      arztId: "arzt-neu",
      arztName: "Prof. Dr. Anna Meier",
      pflegedienstId: "pflege-neu",
      neuerArztId: "arzt-neu",
      neuerPflegedienstId: "pflege-neu",
    });
    expect(doctor.create).toHaveBeenCalledWith({
      data: { name: "Prof. Dr. Anna Meier", praxis: "Praxis am Park" },
    });
    expect(careService.create).toHaveBeenCalledWith({
      data: { name: "Pflege Nord", ansprechpartner: "Lena Sommer" },
    });
  });

  it("erlaubt bei einer Wunde leere optionale Versorgungspartner", async () => {
    const { tx, doctor, careService } = transaktion();

    const ergebnis = await versorgungspartnerAufloesen(
      tx,
      {
        arztId: null,
        neuerArztName: null,
        neueArztPraxis: null,
        pflegedienstId: null,
        neuerPflegedienstName: null,
        neuerPflegedienstAnsprechpartner: null,
      },
      { arztPflicht: false },
    );

    expect(ergebnis.arztId).toBeNull();
    expect(ergebnis.pflegedienstId).toBeNull();
    expect(doctor.create).not.toHaveBeenCalled();
    expect(careService.create).not.toHaveBeenCalled();
  });

  it("ordnet einen fehlenden Namen dem eingeblendeten Neuanlagefeld zu", async () => {
    const { tx } = transaktion();

    await expect(
      versorgungspartnerAufloesen(
        tx,
        {
          arztId: NEUER_STAMMDATENSATZ,
          neuerArztName: null,
          neueArztPraxis: null,
          pflegedienstId: null,
          neuerPflegedienstName: null,
          neuerPflegedienstAnsprechpartner: null,
        },
        { arztPflicht: false },
      ),
    ).rejects.toMatchObject<Partial<VersorgungspartnerFehler>>({
      feld: "neuerArztName",
    });
  });
});
