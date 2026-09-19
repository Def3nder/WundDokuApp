"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { entwurfSpeichern } from "@/actions/aufnahmen";

export type AutosaveStatus = "bereit" | "speichert" | "gespeichert" | "fehler";

function rohdatenAus(formular: HTMLFormElement): Record<string, unknown> {
  const ergebnis: Record<string, unknown> = {};

  for (const [name, wert] of new FormData(formular).entries()) {
    if (wert instanceof File) continue;
    const vorhanden = ergebnis[name];
    if (vorhanden === undefined) ergebnis[name] = wert;
    else if (Array.isArray(vorhanden)) vorhanden.push(wert);
    else ergebnis[name] = [vorhanden, wert];
  }

  return ergebnis;
}

/** Verzögertes Zwischenspeichern eines neuen Aufnahmeformulars. */
export function useAutosave({
  formularRef,
  wundeId,
  initialEntwurfId = null,
  verzoegerungMs = 1800,
}: {
  formularRef: React.RefObject<HTMLFormElement | null>;
  wundeId: string | null;
  initialEntwurfId?: string | null;
  verzoegerungMs?: number;
}) {
  const [entwurfId, setEntwurfId] = useState<string | null>(initialEntwurfId);
  const [status, setStatus] = useState<AutosaveStatus>("bereit");
  const [zeitpunkt, setZeitpunkt] = useState<string | null>(null);
  const entwurfIdRef = useRef<string | null>(initialEntwurfId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const angehaltenRef = useRef(false);
  const laufendRef = useRef<Promise<string | null> | null>(null);

  const fortsetzen = useCallback(() => {
    angehaltenRef.current = false;
  }, []);

  const entwurfUebernehmen = useCallback((id: string) => {
    entwurfIdRef.current = id;
    setEntwurfId(id);
  }, []);

  const speichernJetzt = useCallback(async (): Promise<string | null> => {
    const formular = formularRef.current;
    if (!formular || !wundeId || angehaltenRef.current) return entwurfIdRef.current;
    if (laufendRef.current) return laufendRef.current;

    const auftrag = (async () => {
      setStatus("speichert");
      const ergebnis = await entwurfSpeichern(
        wundeId,
        entwurfIdRef.current,
        rohdatenAus(formular),
      );
      if ("fehler" in ergebnis) {
        setStatus("fehler");
        return null;
      }
      entwurfIdRef.current = ergebnis.entwurfId;
      setEntwurfId(ergebnis.entwurfId);
      setZeitpunkt(ergebnis.zeitpunkt);
      setStatus("gespeichert");
      return ergebnis.entwurfId;
    })();

    laufendRef.current = auftrag;
    try {
      return await auftrag;
    } finally {
      laufendRef.current = null;
    }
  }, [formularRef, wundeId]);

  useEffect(() => {
    const formular = formularRef.current;
    if (!formular || !wundeId) return;
    function planen(event: Event) {
      if (angehaltenRef.current) return;
      if (
        event.type === "click" &&
        event.target instanceof Element &&
        (event.target.closest("[data-autosave-ignore]") ||
          (event.target.closest("button") as HTMLButtonElement | null)?.type !== "button")
      ) {
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("bereit");
      timerRef.current = setTimeout(() => void speichernJetzt(), verzoegerungMs);
    }

    function absenden() {
      angehaltenRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    formular.addEventListener("input", planen);
    formular.addEventListener("change", planen);
    formular.addEventListener("click", planen);
    formular.addEventListener("submit", absenden);

    return () => {
      formular.removeEventListener("input", planen);
      formular.removeEventListener("change", planen);
      formular.removeEventListener("click", planen);
      formular.removeEventListener("submit", absenden);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formularRef, speichernJetzt, verzoegerungMs, wundeId]);

  return {
    entwurfId,
    status,
    zeitpunkt,
    fortsetzen,
    entwurfUebernehmen,
    speichernJetzt,
  };
}
