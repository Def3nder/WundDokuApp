import { describe, expect, it } from "vitest";
import { DIAGNOSE_TYPEN } from "@/lib/enums";
import { wundeAusFormData } from "./wunde";

describe("wundeAusFormData", () => {
  it("erlaubt eine neue Wunde ohne behandelnden Arzt", () => {
    const formular = new FormData();
    formular.set("bezeichnung", "Testwunde");
    formular.set("diagnoseTyp", DIAGNOSE_TYPEN[0].wert);
    formular.set("arztId", "");

    const ergebnis = wundeAusFormData(formular);

    expect(ergebnis.success).toBe(true);
    if (ergebnis.success) expect(ergebnis.data.arztId).toBeNull();
  });
});
