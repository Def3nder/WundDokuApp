import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * SQLite kennt keine Array-Spalten, Mehrfachauswahlen liegen als JSON-String.
 * Defekte Werte duerfen die Seite nicht abstuerzen lassen - dann lieber leer.
 */
export function leseAuswahl(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function schreibeAuswahl(werte: readonly string[] | null | undefined): string {
  return JSON.stringify(werte ?? []);
}
