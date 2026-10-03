"use client";

import { useEffect } from "react";

/**
 * Meldet den Service Worker an (siehe public/sw.js) und laedt die
 * Zeiterfassung im Voraus, damit sie auch offline startet.
 *
 * Nur im Produktionsbetrieb: Im Entwicklungsmodus sind die Dateinamen nicht
 * mit Hash versehen, ein Cache wuerde dort veralteten Code ausliefern.
 */
export function ServiceWorkerRegistrierung() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let beendet = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((anmeldung) => {
        if (!beendet) anmeldung.active?.postMessage({ typ: "vorwaermen", pfade: ["/zeiterfassung"] });
      })
      .catch(() => undefined);
    return () => { beendet = true; };
  }, []);
  return null;
}
