import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  absoluterFotoPfad,
  erkenneBildtyp,
  verarbeiteBild,
} from "./fotos";

const heicConvertMock = vi.hoisted(() => vi.fn());

vi.mock("heic-convert", () => ({ default: heicConvertMock }));

describe("Wundfotos", () => {
  afterEach(() => {
    delete process.env.STORAGE_DIR;
  });

  it("erkennt erlaubte Formate an ihren Magic Bytes", () => {
    expect(erkenneBildtyp(Uint8Array.from([0xff, 0xd8, 0xff]))?.mimeType).toBe("image/jpeg");
    expect(
      erkenneBildtyp(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ?.mimeType,
    ).toBe("image/png");
    expect(erkenneBildtyp(Buffer.from("RIFF0000WEBP"))?.mimeType).toBe("image/webp");
    expect(erkenneBildtyp(Buffer.from("0000ftypheic0000"))?.mimeType).toBe("image/heic");
    expect(erkenneBildtyp(Buffer.from("kein bild"))).toBeNull();
  });

  it("begrenzt die Langkante und entfernt Metadaten", async () => {
    const eingabe = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#b91c1c" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "Patientenbezug" } } })
      .toBuffer();

    const verarbeitet = await verarbeiteBild(eingabe);
    const metadaten = await sharp(verarbeitet.bild).metadata();
    const thumbnail = await sharp(verarbeitet.thumbnail).metadata();

    expect([verarbeitet.breite, verarbeitet.hoehe]).toEqual([2000, 1000]);
    expect([thumbnail.width, thumbnail.height]).toEqual([400, 200]);
    expect(metadaten.format).toBe("webp");
    expect(metadaten.exif).toBeUndefined();
    expect(metadaten.xmp).toBeUndefined();
  });

  it("dekodiert HEIC vor der gemeinsamen WebP-Verarbeitung", async () => {
    const jpeg = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#991b1b" },
    })
      .jpeg()
      .toBuffer();
    heicConvertMock.mockResolvedValueOnce(jpeg);

    const verarbeitet = await verarbeiteBild(Buffer.from("0000ftypheic0000"));

    expect(heicConvertMock).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      format: "JPEG",
      quality: 0.96,
    });
    expect((await sharp(verarbeitet.bild).metadata()).format).toBe("webp");
  });

  it("weist Pfad-Traversal außerhalb des Speichers ab", () => {
    process.env.STORAGE_DIR = "./storage-test";
    expect(() => absoluterFotoPfad("../geheim.txt")).toThrow("Ungültiger Speicherpfad");
    expect(absoluterFotoPfad("photos/p1/w1/foto.webp")).toContain("storage-test");
  });
});
