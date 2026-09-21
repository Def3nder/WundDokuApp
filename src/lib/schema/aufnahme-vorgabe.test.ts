import { describe, expect, it } from "vitest";
import type { Assessment } from "@prisma/client";
import { aufnahmeZuWerten, vorbefuellungAus } from "./aufnahme-vorgabe";

function datensatz(): Assessment {
  return {
    id: "a1",
    woundId: "w1",
    typ: "FOLGEAUFNAHME",
    datum: new Date(2026, 8, 18),
    istEntwurf: false,
    erstelltVonId: null,
    wagnerArmstrongGrad: "2B",
    dekubitusKategorie: null,
    wundumgebung: '["GEROETET"]',
    wundrand: "[]",
    wundgrund: '["GRANULATION"]',
    wundgrundSonstigesText: null,
    breiteMm: 12.5,
    laengeMm: 8,
    tiefeMm: 2,
    exsudatMenge: "SCHWACH_BIS_MAESSIG",
    exsudatFarben: "[]",
    exsudatFarbeSonstiges: null,
    exsudatKonsistenz: "[]",
    geruch: false,
    entzuendungszeichen: "[]",
    lokaleInfektzeichen: "[]",
    systemischeZeichen: false,
    infektionSonstiges: null,
    abstrichGenommen: false,
    abstrichErgebnis: null,
    schmerzen: true,
    schmerzVas: 3,
    schmerzWundeModus: "GESAMT",
    schmerzWundeUhr: null,
    schmerzWundrandModus: null,
    schmerzWundrandUhr: null,
    schmerzWundumgebungModus: null,
    schmerzWundumgebungUhr: null,
    schmerzVerbandwechsel: false,
    schmerzVerbandwechselVas: null,
    schmerzDruck: false,
    schmerzDruckVas: null,
    schmerzUeberall: false,
    schmerzUeberallVas: null,
    schmerztagebuch: false,
    schmerzSonstiges: null,
    wundheilungsfaktoren: null,
    wundspuelung: "[]",
    wundspuelungSonstiges: null,
    reinigung: "[]",
    reinigungSonstiges: null,
    hautpflege: null,
    wundrandschutz: null,
    wundfuellung: "[]",
    wundfuellungGroesseCm: null,
    wundfuellungSonstiges: null,
    wundabdeckung: "[]",
    wundabdeckungGroesseCm: null,
    wundabdeckungSonstiges: null,
    fixierung: "[]",
    fixierungSonstiges: null,
    kompression: "[]",
    kompressionBinde1BreiteCm: null,
    kompressionBinde1Anzahl: null,
    kompressionBinde2BreiteCm: null,
    kompressionBinde2Anzahl: null,
    kompressionKlasse: null,
    kompressionMass: null,
    therapieSonstiges: null,
    anmerkungen: "Kontrolle",
    geloeschtAm: null,
    createdAt: new Date(2026, 8, 18),
    updatedAt: new Date(2026, 8, 18),
    wundeGeheilt: false,
  };
}

describe("Aufnahme-Vorgaben", () => {
  it("wandelt Datenbankwerte in Formularwerte um", () => {
    const werte = aufnahmeZuWerten(datensatz());
    expect(werte.datum).toBe("2026-09-18");
    expect(werte.wundumgebung).toEqual(["GEROETET"]);
    expect(werte.breiteMm).toBe("12.5");
    expect(werte.schmerzVas).toBe(3);
  });

  it("übernimmt Befunde, aber niemals alte Messwerte", () => {
    const werte = vorbefuellungAus(datensatz());
    expect(werte.wundgrund).toEqual(["GRANULATION"]);
    expect(werte.anmerkungen).toBe("Kontrolle");
    expect(werte.breiteMm).toBe("");
    expect(werte.laengeMm).toBe("");
    expect(werte.tiefeMm).toBe("");
  });
});
