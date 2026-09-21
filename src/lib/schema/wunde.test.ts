import { describe, expect, it } from "vitest";
import { DIAGNOSE_TYPEN } from "@/lib/enums";
import { NEUER_STAMMDATENSATZ } from "@/lib/versorgungspartner";
import { wundeAusFormData } from "./wunde";

describe("wundeAusFormData", () => {
  it("erlaubt eine neue Wunde ohne behandelnden Arzt", () => {
    const formular = new FormData();
    formular.set("bezeichnung", "Testwunde");
    formular.set("diagnoseTyp", DIAGNOSE_TYPEN[0].wert);
    formular.set("arztId", "");
    formular.set("lokalisationModus", "MARKER");

    const ergebnis = wundeAusFormData(formular);

    expect(ergebnis.success).toBe(true);
    if (ergebnis.success) expect(ergebnis.data.arztId).toBeNull();
  });

  it("liest die Neuanlage zentraler Versorgungspartner aus dem Formular", () => {
    const formular = new FormData();
    formular.set("bezeichnung", "Testwunde");
    formular.set("diagnoseTyp", DIAGNOSE_TYPEN[0].wert);
    formular.set("lokalisationModus", "FREIHAND");
    formular.set("arztId", NEUER_STAMMDATENSATZ);
    formular.set("neuerArztName", "Prof. Dr. Anna Meier");
    formular.set("neueArztPraxis", "Praxis am Park");
    formular.set("pflegedienstId", NEUER_STAMMDATENSATZ);
    formular.set("neuerPflegedienstName", "Pflege Nord");
    formular.set("neuerPflegedienstAnsprechpartner", "Lena Sommer");

    const ergebnis = wundeAusFormData(formular);

    expect(ergebnis.success).toBe(true);
    if (ergebnis.success) {
      expect(ergebnis.data).toMatchObject({
        arztId: NEUER_STAMMDATENSATZ,
        neuerArztName: "Prof. Dr. Anna Meier",
        pflegedienstId: NEUER_STAMMDATENSATZ,
        neuerPflegedienstName: "Pflege Nord",
        lokalisationModus: "FREIHAND",
      });
    }
  });
});
