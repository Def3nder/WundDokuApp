"use client";

import { useEffect } from "react";

const FORMULAR_SELECTOR = "form[data-aenderungen-warnung]";
const WARNUNG =
  "Es gibt ungespeicherte Änderungen. Möchten Sie diese Seite wirklich verlassen?";

function dateiSignatur(datei: File) {
  return `${datei.name}:${datei.size}:${datei.type}:${datei.lastModified}`;
}

function formularSignatur(formular: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(formular).entries())
      .filter(([name]) => !name.startsWith("$ACTION_") && name !== "entwurfId")
      .map(([name, wert]) => [
        name,
        typeof wert === "string" ? wert : dateiSignatur(wert),
      ]),
  );
}

function formularSchluessel(formular: HTMLFormElement) {
  return `${window.location.pathname}|${formular.dataset.aenderungenWarnung}`;
}

/**
 * Warnt ausschließlich bei Formularen, die sich explizit mit
 * `data-aenderungen-warnung` anmelden. So bleiben Such-, Lösch- und
 * Abmeldeformulare frei von falschen Warnungen.
 */
export function UngespeicherteAenderungenSchutz() {
  useEffect(() => {
    const ausgangswerte = new Map<string, string>();
    let hatAenderungen = false;
    let auswertungGeplant = false;
    let auswertungFrame: number | null = null;

    function formulare() {
      return Array.from(document.querySelectorAll<HTMLFormElement>(FORMULAR_SELECTOR));
    }

    function auswerten() {
      auswertungGeplant = false;
      auswertungFrame = null;
      const aktuelleFormulare = formulare();
      if (aktuelleFormulare.length === 0) {
        ausgangswerte.clear();
        hatAenderungen = false;
        document.documentElement.dataset.ungespeicherteAenderungen = "false";
        return;
      }

      hatAenderungen = aktuelleFormulare.some((formular) => {
        const schluessel = formularSchluessel(formular);
        const aktuell = formularSignatur(formular);
        if (!ausgangswerte.has(schluessel)) ausgangswerte.set(schluessel, aktuell);
        return ausgangswerte.get(schluessel) !== aktuell;
      });
      document.documentElement.dataset.ungespeicherteAenderungen = String(hatAenderungen);
    }

    function auswertungPlanen() {
      if (auswertungGeplant) return;
      auswertungGeplant = true;
      auswertungFrame = requestAnimationFrame(auswerten);
    }

    function vorVerlassen(event: BeforeUnloadEvent) {
      if (!hatAenderungen) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function linkAbfangen(event: MouseEvent): boolean {
      if (!hatAenderungen || event.defaultPrevented || event.button !== 0) return false;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
      const ziel = event.target;
      if (!(ziel instanceof Element)) return false;
      const link = ziel.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return false;

      const url = new URL(link.href, window.location.href);
      if (!/^https?:$/.test(url.protocol) || url.pathname.startsWith("/api/")) return false;
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return false;
      }

      if (!window.confirm(WARNUNG)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      // Verhindert eine zweite native beforeunload-Warnung bei klassischen
      // Navigationen. Die Zielseite registriert ihre Formulare neu.
      hatAenderungen = false;
      ausgangswerte.clear();
      document.documentElement.dataset.ungespeicherteAenderungen = "false";
      return true;
    }

    function klickAuswerten(event: MouseEvent) {
      const istNavigation = linkAbfangen(event);
      if (!istNavigation && !event.defaultPrevented) auswertungPlanen();
    }

    const beobachter = new MutationObserver(auswertungPlanen);
    beobachter.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", auswertungPlanen, true);
    document.addEventListener("change", auswertungPlanen, true);
    document.addEventListener("reset", auswertungPlanen, true);
    document.addEventListener("pointerup", auswertungPlanen, true);
    document.addEventListener("click", klickAuswerten, true);
    window.addEventListener("beforeunload", vorVerlassen);
    auswerten();

    return () => {
      beobachter.disconnect();
      document.removeEventListener("input", auswertungPlanen, true);
      document.removeEventListener("change", auswertungPlanen, true);
      document.removeEventListener("reset", auswertungPlanen, true);
      document.removeEventListener("pointerup", auswertungPlanen, true);
      document.removeEventListener("click", klickAuswerten, true);
      window.removeEventListener("beforeunload", vorVerlassen);
      if (auswertungFrame != null) cancelAnimationFrame(auswertungFrame);
      delete document.documentElement.dataset.ungespeicherteAenderungen;
    };
  }, []);

  return null;
}
