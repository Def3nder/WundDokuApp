import type { Photo } from "@prisma/client";

export const FOTO_MAX_BYTES = 15 * 1024 * 1024;

export type FotoAnsicht = {
  id: string;
  dateiname: string;
  beschreibung: string;
  reihenfolge: number;
  breite: number;
  hoehe: number;
  groesseBytes: number;
  aufgenommenAm: string;
  url: string;
  thumbnailUrl: string;
};

export function fotoZuAnsicht(foto: Photo): FotoAnsicht {
  return {
    id: foto.id,
    dateiname: foto.dateiname,
    beschreibung: foto.beschreibung ?? "",
    reihenfolge: foto.reihenfolge,
    breite: foto.breite,
    hoehe: foto.hoehe,
    groesseBytes: foto.groesseBytes,
    aufgenommenAm: foto.aufgenommenAm.toISOString(),
    url: `/api/photos/${foto.id}`,
    thumbnailUrl: `/api/photos/${foto.id}?thumbnail=1`,
  };
}
