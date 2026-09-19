import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { storageVerzeichnis } from "@/lib/fotos";

export const DOKUMENT_MAX_BYTES = 20 * 1024 * 1024;

export class DokumentFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DokumentFehler";
  }
}

export function erkenneDokumenttyp(daten: Uint8Array): { mimeType: string; endung: string } | null {
  const puffer = Buffer.from(daten);
  if (puffer.subarray(0, 5).toString("ascii") === "%PDF-") return { mimeType: "application/pdf", endung: "pdf" };
  if (puffer[0] === 0xff && puffer[1] === 0xd8 && puffer[2] === 0xff) return { mimeType: "image/jpeg", endung: "jpg" };
  if (puffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: "image/png", endung: "png" };
  if (puffer.subarray(0, 4).toString("ascii") === "RIFF" && puffer.subarray(8, 12).toString("ascii") === "WEBP") return { mimeType: "image/webp", endung: "webp" };
  const marke = puffer.subarray(4, 12).toString("ascii");
  if (marke.startsWith("ftyp") && /hei[cf]|mif1/.test(marke)) return { mimeType: "image/heic", endung: "heic" };
  return null;
}

export function bereinigeDokumentDateiname(name: string): string {
  return path.basename(name).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180) || "dokument";
}

export function absoluterDokumentPfad(relativerPfad: string): string {
  const basis = path.resolve(storageVerzeichnis());
  const ziel = path.resolve(basis, relativerPfad);
  if (!ziel.startsWith(`${basis}${path.sep}`)) throw new DokumentFehler("Ungültiger Speicherpfad");
  return ziel;
}

export async function speichereDokument(patientId: string, daten: Buffer) {
  if (daten.length === 0) throw new DokumentFehler("Die Datei ist leer.");
  if (daten.length > DOKUMENT_MAX_BYTES) throw new DokumentFehler("Die Datei darf höchstens 20 MB groß sein.");
  const typ = erkenneDokumenttyp(daten);
  if (!typ) throw new DokumentFehler("Erlaubt sind PDF-, JPEG-, PNG-, WebP- und HEIC-Dateien.");

  const relativerPfad = path.posix.join("documents", patientId, `${randomUUID()}.${typ.endung}`);
  const ziel = absoluterDokumentPfad(relativerPfad);
  const temporaer = `${ziel}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(temporaer, daten, { flag: "wx" });
  await rename(temporaer, ziel);
  return { pfad: relativerPfad, mimeType: typ.mimeType, groesseBytes: daten.length };
}

export async function loescheDokumentDatei(relativerPfad: string): Promise<void> {
  try {
    await unlink(absoluterDokumentPfad(relativerPfad));
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code !== "ENOENT") throw fehler;
  }
}
