"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { arbeitszeitSpeichern } from "@/actions/arbeitszeit";
import {
  ergebnisMeldung, formDataAus, pruefeVorAblage, werteAusFormData,
  type WarteEintrag, type Zeitraum,
} from "@/lib/arbeitszeit-offline";
import { entferneWartenden, ladeWarteschlange, speichereWartenden } from "@/lib/arbeitszeit-speicher";
import type { ZeitErgebnis } from "@/lib/schema/arbeitszeit";

const KANAL = "wunddoku-zeiterfassung";
const SPERRE = "wunddoku-zeiterfassung-senden";
const ZEITLIMIT_MS = 20_000;

type Bezug = { clientId?: string };

type OfflineZeit = {
  eintraege: WarteEintrag[];
  online: boolean;
  sendet: boolean;
  /** Das letzte Senden scheiterte, obwohl das Geraet eine Verbindung meldet. */
  sendeProblem: boolean;
  /** Speichert eine Buchung: sofort beim Server oder, wenn der nicht erreichbar ist, auf dem Geraet. */
  aktion: (bezug?: Bezug) => (fd: FormData) => Promise<ZeitErgebnis>;
  verwerfen: (clientId: string) => Promise<void>;
  erneutSenden: (clientId: string) => Promise<void>;
  senden: () => Promise<void>;
};

const Kontext = createContext<OfflineZeit | null>(null);

/** Ausserhalb der Zeiterfassungsseite (null) gibt es keine Offline-Ablage. */
export function useOfflineZeit(): OfflineZeit | null {
  return useContext(Kontext);
}

function abonniereVerbindung(melden: () => void) {
  window.addEventListener("online", melden);
  window.addEventListener("offline", melden);
  return () => { window.removeEventListener("online", melden); window.removeEventListener("offline", melden); };
}

function mitZeitlimit<T>(versprechen: Promise<T>): Promise<T> {
  return new Promise<T>((erfolg, fehler) => {
    const timer = setTimeout(() => fehler(new Error("Zeitüberschreitung")), ZEITLIMIT_MS);
    versprechen.then((wert) => { clearTimeout(timer); erfolg(wert); }, (grund) => { clearTimeout(timer); fehler(grund); });
  });
}

function neueKennung(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function OfflineZeitProvider({ userId, bekannt, children }: {
  userId: string;
  /** Buchungen, die die Seite gerade anzeigt, fuer die Ueberschneidungspruefung ohne Netz. */
  bekannt: { id: string; beginn: string; ende: string | null }[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [alle, setAlle] = useState<WarteEintrag[]>([]);
  const [sendet, setSendet] = useState(false);
  const [sendeProblem, setSendeProblem] = useState(false);
  const online = useSyncExternalStore(abonniereVerbindung, () => navigator.onLine, () => true);
  const eintraege = useMemo(() => alle.filter((e) => e.userId === userId), [alle, userId]);
  const zeitraeume = useMemo<Zeitraum[]>(() => bekannt.map((b) => ({ id: b.id, beginn: new Date(b.beginn), ende: b.ende ? new Date(b.ende) : null })), [bekannt]);
  const aktuell = useRef({ eintraege, zeitraeume });
  const kanal = useRef<BroadcastChannel | null>(null);
  const laeuft = useRef(false);

  useEffect(() => { aktuell.current = { eintraege, zeitraeume }; }, [eintraege, zeitraeume]);

  const laden = useCallback(async () => {
    try { setAlle(await ladeWarteschlange()); } catch { /* Ohne IndexedDB gibt es keine Warteschlange. */ }
  }, []);
  const geaendert = useCallback(async () => { await laden(); kanal.current?.postMessage("geaendert"); }, [laden]);

  useEffect(() => {
    void laden();
    if (typeof BroadcastChannel === "undefined") return;
    const k = new BroadcastChannel(KANAL);
    kanal.current = k;
    k.onmessage = () => void laden();
    return () => { k.close(); kanal.current = null; };
  }, [laden]);

  const senden = useCallback(async () => {
    if (laeuft.current) return;
    laeuft.current = true;
    setSendet(true);
    const lauf = async () => {
      const wartende = (await ladeWarteschlange())
        .filter((e) => e.userId === userId && e.status === "wartet")
        .sort((a, b) => a.erstellt.localeCompare(b.erstellt));
      let uebertragen = 0;
      let abgebrochen = false;
      for (const eintrag of wartende) {
        let ergebnis: ZeitErgebnis;
        try { ergebnis = await mitZeitlimit(arbeitszeitSpeichern(formDataAus(eintrag.werte))); }
        catch { abgebrochen = true; break; }
        // Wurde der Eintrag waehrenddessen korrigiert, bleibt die neue Fassung erhalten.
        const jetzt = (await ladeWarteschlange()).find((e) => e.clientId === eintrag.clientId);
        const unveraendert = jetzt && JSON.stringify(jetzt.werte) === JSON.stringify(eintrag.werte);
        if (ergebnis.ok) {
          if (unveraendert) await entferneWartenden(eintrag.clientId);
          uebertragen += 1;
        } else if (unveraendert) {
          await speichereWartenden({ ...eintrag, status: "pruefen", meldung: ergebnisMeldung(ergebnis) });
        }
      }
      if (wartende.length > 0) setSendeProblem(abgebrochen);
      await geaendert();
      if (uebertragen > 0) router.refresh();
    };
    try {
      // Mehrere Tabs duerfen dieselbe Warteschlange nicht gleichzeitig senden.
      if (navigator.locks) await navigator.locks.request(SPERRE, lauf); else await lauf();
    } catch { setSendeProblem(true); }
    finally { laeuft.current = false; setSendet(false); }
  }, [userId, geaendert, router]);

  const wartend = eintraege.filter((e) => e.status === "wartet").length;
  useEffect(() => {
    if (wartend === 0 || !online) return;
    void senden();
    const timer = setInterval(() => void senden(), 30_000);
    const sichtbar = () => { if (document.visibilityState === "visible") void senden(); };
    document.addEventListener("visibilitychange", sichtbar);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sichtbar); };
  }, [wartend, online, senden]);

  const ablegen = useCallback(async (werte: Record<string, string>, clientId?: string): Promise<ZeitErgebnis> => {
    const { eintraege: vorhandene, zeitraeume: bekannteZeitraeume } = aktuell.current;
    const pruefung = pruefeVorAblage(werte, bekannteZeitraeume, vorhandene, clientId);
    if (!pruefung.ok) return pruefung.ergebnis;
    const alt = vorhandene.find((e) => e.clientId === clientId);
    const eintrag: WarteEintrag = {
      clientId: alt?.clientId ?? clientId ?? neueKennung(), userId, erstellt: alt?.erstellt ?? new Date().toISOString(),
      werte, status: "wartet",
    };
    try { await speichereWartenden(eintrag); }
    catch { return { meldung: "Keine Verbindung zum Server, und die Buchung konnte auch nicht auf diesem Gerät gespeichert werden. Bitte die Zeit notieren und später erneut eintragen." }; }
    await geaendert();
    return { ok: true };
  }, [userId, geaendert]);

  const aktion = useCallback((bezug: Bezug = {}) => async (fd: FormData): Promise<ZeitErgebnis> => {
    if (navigator.onLine !== false) {
      try {
        const ergebnis = await mitZeitlimit(arbeitszeitSpeichern(fd));
        if (ergebnis.ok) {
          if (bezug.clientId) await entferneWartenden(bezug.clientId).catch(() => undefined);
          await geaendert();
        }
        return ergebnis;
      } catch { /* Server nicht erreichbar oder Sitzung abgelaufen: lokal ablegen. */ }
    }
    return ablegen(werteAusFormData(fd), bezug.clientId);
  }, [ablegen, geaendert]);

  const verwerfen = useCallback(async (clientId: string) => { await entferneWartenden(clientId); await geaendert(); }, [geaendert]);
  const erneutSenden = useCallback(async (clientId: string) => {
    const eintrag = (await ladeWarteschlange()).find((e) => e.clientId === clientId);
    if (eintrag) await speichereWartenden({ ...eintrag, status: "wartet", meldung: undefined });
    await geaendert();
  }, [geaendert]);

  const wert = useMemo<OfflineZeit>(
    () => ({ eintraege, online, sendet, sendeProblem, aktion, verwerfen, erneutSenden, senden }),
    [eintraege, online, sendet, sendeProblem, aktion, verwerfen, erneutSenden, senden],
  );
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}
