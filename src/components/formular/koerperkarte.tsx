"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  KOERPERKARTE_BREITE,
  KOERPERKARTE_HOEHE,
  KOERPERKARTE_MARKER,
} from "@/lib/koerperkarte";
import { beschreibeLokalisation } from "@/lib/wundtext";

export type LokalisationWahl = {
  region: string;
  seite: string;
  ausrichtung: string;
};

function gleich(a: string, b: string | null) {
  return a === (b ?? "");
}

/**
 * Erste Markierung, die zu den aktuellen Dropdown-Werten passt - oder `null`.
 * Mehrere Markierungen koennen dieselbe Region/Seite/Ausrichtung teilen (z. B.
 * zwei Punkte am Fußrücken); hier zaehlt bewusst nur der erste Treffer, damit
 * beim Laden einer gespeicherten Wunde nie mehr als eine Markierung aktiv wird.
 */
function findeMarkerIndex(wert: LokalisationWahl): number | null {
  if (!wert.region) return null;
  const index = KOERPERKARTE_MARKER.findIndex(
    (m) =>
      wert.region === m.region &&
      gleich(wert.seite, m.seite) &&
      gleich(wert.ausrichtung, m.ausrichtung),
  );
  return index === -1 ? null : index;
}

/**
 * Bildbasierte Ergänzung zu den drei Lokalisations-Dropdowns: Klick auf eine
 * Markierung befüllt Region/Seite/Ausrichtung. Die Dropdowns bleiben die
 * massgebliche, vollstaendig tastatur- und screenreaderbediente Eingabe -
 * diese Karte ist ein optionaler visueller Schnellzugriff.
 *
 * Aktiv ist immer höchstens eine Markierung: Ein Klick merkt sich deren
 * genauen Index (nicht nur die Werte), Änderungen an den Dropdowns von aussen
 * ziehen die erste passende Markierung nach.
 */
export function KoerperKarte({
  wert,
  onWahl,
}: {
  wert: LokalisationWahl;
  onWahl: (wahl: LokalisationWahl) => void;
}) {
  const [aktiverIndex, setAktiverIndex] = useState<number | null>(() => findeMarkerIndex(wert));

  useEffect(() => {
    setAktiverIndex(findeMarkerIndex(wert));
  }, [wert.region, wert.seite, wert.ausrichtung]);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        Auf der Körperkarte wählen (ergänzt die Auswahl oben)
      </legend>
      {/* max-w so breit, dass selbst die beiden eng benachbarten Kopf-Punkte
          (44px Originalabstand) den WCAG-Mindestabstand von 24px zwischen
          Zielflächen einhalten (SC 2.5.8) - siehe koerperkarte.test.ts.
          Die Höhe des Containers kommt bewusst über den klassischen
          "padding-top-Trick" (Innenabstand oben als Prozentsatz der Breite),
          nicht über die CSS-Eigenschaft `aspect-ratio`: In iOS Safari lösten
          absolut positionierte Kind-Elemente ihre Prozent-Position (`top`)
          nachweislich nicht zuverlässig gegen eine nur über `aspect-ratio`
          hergestellte Containerhöhe auf, wodurch alle Marker sichtbar daneben
          saßen (in Chrome, auch mobil emuliert, dagegen korrekt). Der
          Padding-Trick erzwingt eine echte, für jeden Browser eindeutige
          Blockhöhe und ist die seit Jahren browserübergreifend verlässliche
          Lösung für responsive Bild-Overlays. */}
      <div className="relative mx-auto w-full max-w-[720px] select-none">
        <div style={{ paddingTop: `${(KOERPERKARTE_HOEHE / KOERPERKARTE_BREITE) * 100}%` }} />
        <img
          src="/koerperkarte.webp"
          alt=""
          width={KOERPERKARTE_BREITE}
          height={KOERPERKARTE_HOEHE}
          className="absolute inset-0 size-full rounded-lg border border-border-strong"
          draggable={false}
        />
        {KOERPERKARTE_MARKER.map((m, i) => {
          const aktiv = i === aktiverIndex;
          const label = beschreibeLokalisation({
            lokalisationRegion: m.region,
            lokalisationSeite: m.seite,
            lokalisationAusrichtung: m.ausrichtung,
            lokalisationFreitext: null,
          });

          return (
            <button
              key={i}
              type="button"
              aria-pressed={aktiv}
              aria-label={label}
              title={label}
              onClick={() => {
                setAktiverIndex(i);
                onWahl({
                  region: m.region,
                  seite: m.seite ?? "",
                  ausrichtung: m.ausrichtung ?? "",
                });
              }}
              className={cn(
                // 24px = WCAG-Mindestgröße für Zielflächen (SC 2.5.8).
                "absolute size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full",
                "border-2 border-primary/60 bg-primary/15 transition-colors hover:bg-primary/40",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                aktiv && "border-primary bg-primary/80",
              )}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
