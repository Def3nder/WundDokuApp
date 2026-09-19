import { describe, expect, it } from "vitest";
import type { Patient, Wound } from "@prisma/client";
import { pdfDateiname } from "./export";

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    nachname: "Müller",
    vorname: "Änne",
    geburtsdatum: new Date(1950, 0, 1),
    patientennummer: "P-10001",
    arztTherapieverantwortlich: null,
    notizen: null,
    geloeschtAm: null,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    angelegtVonId: null,
    ...overrides,
  };
}

function wunde(overrides: Partial<Wound> = {}): Wound {
  return {
    id: "w1",
    patientId: "p1",
    bezeichnung: "Ulcus, links lateral",
    diagnoseTyp: "ULCUS_CRURIS_VENOSUM",
    diagnoseFreitext: null,
    lokalisationRegion: null,
    lokalisationSeite: null,
    lokalisationAusrichtung: null,
    lokalisationFreitext: null,
    bestehtSeitWert: null,
    bestehtSeitEinheit: null,
    rezidiv: false,
    rezidivAnzahl: null,
    abgeschlossenAm: null,
    geloeschtAm: null,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

describe("pdfDateiname", () => {
  it("ersetzt Umlaute und Sonderzeichen fuer einen unbedenklichen Dateinamen", () => {
    const name = pdfDateiname(patient(), wunde(), new Date(2026, 8, 19));
    expect(name).toBe("Wunddokumentation_Mueller-Aenne_Ulcus-links-lateral_19-09-2026.pdf");
  });

  it("nutzt 'Verlauf' statt eines Datums, wenn keins uebergeben wird", () => {
    const name = pdfDateiname(patient(), wunde());
    expect(name).toContain("_Verlauf.pdf");
  });
});
