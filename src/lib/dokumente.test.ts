import { afterEach, describe, expect, it } from "vitest";
import { absoluterDokumentPfad, bereinigeDokumentDateiname, erkenneDokumenttyp } from "./dokumente";

describe("Patientendokumente", () => {
  afterEach(() => delete process.env.STORAGE_DIR);

  it("erkennt PDF und erlaubte Bildformate an ihren Dateiinhalten", () => {
    expect(erkenneDokumenttyp(Buffer.from("%PDF-1.7"))?.mimeType).toBe("application/pdf");
    expect(erkenneDokumenttyp(Uint8Array.from([0xff, 0xd8, 0xff]))?.mimeType).toBe("image/jpeg");
    expect(erkenneDokumenttyp(Buffer.from("kein dokument"))).toBeNull();
  });

  it("bereinigt Dateinamen und blockiert Pfad-Traversal", () => {
    process.env.STORAGE_DIR = "./storage-test";
    expect(bereinigeDokumentDateiname("../Arztbrief.pdf")).toBe("Arztbrief.pdf");
    expect(() => absoluterDokumentPfad("../geheim.pdf")).toThrow("Ungültiger Speicherpfad");
  });
});
