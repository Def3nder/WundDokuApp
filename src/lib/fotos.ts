import path from "node:path";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { FOTO_MAX_BYTES } from "@/lib/foto-typen";

export const FOTO_MAX_PIXEL = 40_000_000;
export const FOTO_MAX_KANTE = 2000;
export const THUMBNAIL_MAX_KANTE = 400;

export class FotoFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FotoFehler";
  }
}

export type ErkanntesBild = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic";
  endung: "jpg" | "png" | "webp" | "heic";
};

function beginntMit(daten: Uint8Array, signatur: readonly number[]): boolean {
  return signatur.every((wert, index) => daten[index] === wert);
}

/** Erkennt den Dateityp ausschließlich anhand der Binärsignatur. */
export function erkenneBildtyp(daten: Uint8Array): ErkanntesBild | null {
  if (beginntMit(daten, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", endung: "jpg" };
  }
  if (beginntMit(daten, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", endung: "png" };
  }
  if (
    daten.length >= 12 &&
    String.fromCharCode(...daten.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...daten.slice(8, 12)) === "WEBP"
  ) {
    return { mimeType: "image/webp", endung: "webp" };
  }
  if (daten.length >= 16 && String.fromCharCode(...daten.slice(4, 8)) === "ftyp") {
    const marken = String.fromCharCode(...daten.slice(8, Math.min(daten.length, 40)));
    if (["heic", "heix", "hevc", "hevx"].some((marke) => marken.includes(marke))) {
      return { mimeType: "image/heic", endung: "heic" };
    }
  }
  return null;
}

export type VerarbeitetesFoto = {
  bild: Buffer;
  thumbnail: Buffer;
  breite: number;
  hoehe: number;
  mimeType: "image/webp";
};

/**
 * Dreht nach EXIF-Ausrichtung, begrenzt die Größe und kodiert neu. Weil weder
 * `withMetadata()` noch `keepMetadata()` verwendet wird, gelangen keine EXIF-,
 * GPS-, XMP- oder ICC-Daten in die Ausgabedateien.
 */
export async function verarbeiteBild(daten: Buffer): Promise<VerarbeitetesFoto> {
  if (daten.length === 0) throw new FotoFehler("Die Bilddatei ist leer.");
  if (daten.length > FOTO_MAX_BYTES) {
    throw new FotoFehler("Ein Foto darf höchstens 15 MB groß sein.");
  }
  const bildtyp = erkenneBildtyp(daten);
  if (!bildtyp) {
    throw new FotoFehler("Nur JPEG-, PNG-, WebP- und HEIC-Fotos sind erlaubt.");
  }

  try {
    // Die mit Windows ausgelieferte sharp/libvips-Variante dekodiert HEIC nicht
    // verlaesslich. Der lokale Fallback wandelt nur die Pixel in JPEG um; danach
    // durchlaeuft das Bild dieselbe Metadaten-freie WebP-Pipeline wie alle anderen.
    const dekodierbareDaten =
      bildtyp.mimeType === "image/heic"
        ? Buffer.from(
            await heicConvert({
              buffer: daten,
              format: "JPEG",
              quality: 0.96,
            }),
          )
        : daten;

    const voll = await sharp(dekodierbareDaten, {
      failOn: "error",
      limitInputPixels: FOTO_MAX_PIXEL,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: FOTO_MAX_KANTE,
        height: FOTO_MAX_KANTE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await sharp(voll.data, {
      failOn: "error",
      limitInputPixels: FOTO_MAX_PIXEL,
    })
      .resize({
        width: THUMBNAIL_MAX_KANTE,
        height: THUMBNAIL_MAX_KANTE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, smartSubsample: true })
      .toBuffer();

    if (!voll.info.width || !voll.info.height) {
      throw new FotoFehler("Die Bildabmessungen konnten nicht gelesen werden.");
    }

    return {
      bild: voll.data,
      thumbnail,
      breite: voll.info.width,
      hoehe: voll.info.height,
      mimeType: "image/webp",
    };
  } catch (fehler) {
    if (fehler instanceof FotoFehler) throw fehler;
    throw new FotoFehler(
      "Das Foto konnte nicht verarbeitet werden. Bitte JPEG, PNG, WebP oder ein unterstütztes HEIC verwenden.",
    );
  }
}

export function storageVerzeichnis(): string {
  // Das Verzeichnis ist Laufzeitkonfiguration und darf nicht in das Server-
  // Bundle verfolgt werden (sonst würde Turbopack das ganze Projekt einpacken).
  return path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");
}

/** Löst nur Pfade innerhalb von STORAGE_DIR auf; Traversal wird abgewiesen. */
export function absoluterFotoPfad(relativerPfad: string): string {
  const basis = storageVerzeichnis();
  const ziel = path.resolve(basis, ...relativerPfad.split(/[\\/]+/));
  if (!ziel.startsWith(`${basis}${path.sep}`)) {
    throw new Error("Ungültiger Speicherpfad");
  }
  return ziel;
}

function sicheresSegment(wert: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(wert)) throw new Error("Ungültige Speicher-ID");
  return wert;
}

export function neueFotoPfade(patientId: string, woundId: string) {
  const basis = `photos/${sicheresSegment(patientId)}/${sicheresSegment(woundId)}`;
  const kennung = randomUUID();
  return {
    pfad: `${basis}/${kennung}.webp`,
    thumbnailPfad: `${basis}/${kennung}.thumb.webp`,
  };
}

async function atomarSchreiben(relativerPfad: string, daten: Buffer): Promise<void> {
  const ziel = absoluterFotoPfad(relativerPfad);
  const temporaer = `${ziel}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(temporaer, daten, { flag: "wx" });
  await rename(temporaer, ziel);
}

export async function speichereFoto(
  pfad: string,
  thumbnailPfad: string,
  foto: VerarbeitetesFoto,
): Promise<void> {
  try {
    await atomarSchreiben(pfad, foto.bild);
    await atomarSchreiben(thumbnailPfad, foto.thumbnail);
  } catch (fehler) {
    await Promise.allSettled([loescheFotoDatei(pfad), loescheFotoDatei(thumbnailPfad)]);
    throw fehler;
  }
}

export async function loescheFotoDatei(relativerPfad: string): Promise<void> {
  try {
    await unlink(absoluterFotoPfad(relativerPfad));
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code !== "ENOENT") throw fehler;
  }
}

export function bereinigeDateiname(name: string): string {
  const basis = path.basename(name).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (basis || "wundfoto").slice(0, 255);
}
