import type { WarteEintrag } from "@/lib/arbeitszeit-offline";

/**
 * Dauerhafte Ablage der noch nicht uebertragenen Buchungen im Browser
 * (IndexedDB). Nur fuer die eigene Zeiterfassung; Patienten-, Wund- und
 * Fotodaten gelangen niemals hierher.
 */

const DATENBANK = "wunddoku-zeiterfassung";
const ABLAGE = "warteschlange";

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((erfolg, fehler) => {
    const anfrage = indexedDB.open(DATENBANK, 1);
    anfrage.onupgradeneeded = () => {
      if (!anfrage.result.objectStoreNames.contains(ABLAGE)) anfrage.result.createObjectStore(ABLAGE, { keyPath: "clientId" });
    };
    anfrage.onsuccess = () => erfolg(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error ?? new Error("IndexedDB nicht verfügbar"));
  });
}

async function ausfuehren<T>(modus: IDBTransactionMode, arbeit: (ablage: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffnen();
  try {
    return await new Promise<T>((erfolg, fehler) => {
      const transaktion = db.transaction(ABLAGE, modus);
      const anfrage = arbeit(transaktion.objectStore(ABLAGE));
      // Erst die abgeschlossene Transaktion zaehlt als dauerhaft gespeichert.
      transaktion.oncomplete = () => erfolg(anfrage.result);
      transaktion.onerror = () => fehler(transaktion.error ?? new Error("Speichern fehlgeschlagen"));
      transaktion.onabort = () => fehler(transaktion.error ?? new Error("Speichern abgebrochen"));
    });
  } finally {
    db.close();
  }
}

export function ladeWarteschlange(): Promise<WarteEintrag[]> {
  return ausfuehren("readonly", (ablage) => ablage.getAll() as IDBRequest<WarteEintrag[]>);
}

export async function speichereWartenden(eintrag: WarteEintrag): Promise<void> {
  await ausfuehren("readwrite", (ablage) => ablage.put(eintrag));
  // Haelt den Browser davon ab, die Ablage bei Speicherknappheit zu leeren.
  void navigator.storage?.persist?.().catch(() => undefined);
}

export async function entferneWartenden(clientId: string): Promise<void> {
  await ausfuehren("readwrite", (ablage) => ablage.delete(clientId));
}
