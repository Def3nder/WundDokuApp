"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KOERPERKARTE_BREITE, KOERPERKARTE_HOEHE } from "@/lib/koerperkarte";

export type FreihandMarker = { x: number; y: number; radius: number };

/** % der Bildbreite - ein Tipp ohne Ziehen ergibt sonst einen unsichtbaren Punkt. */
const MINDESTRADIUS = 1.5;
/** Verhältnis Breite/Höhe der Vorlage - macht aus Breiten- eine Höhen-Prozentangabe, damit der Kreis rund bleibt. */
const HOEHENFAKTOR = KOERPERKARTE_BREITE / KOERPERKARTE_HOEHE;

function begrenzen(wert: number, min: number, max: number) {
  return Math.min(max, Math.max(min, wert));
}

/**
 * Freies Einzeichnen eines einzelnen roten Markers auf dem unmarkierten
 * Körperbild - Alternative zur Körperkarte mit vorgegebenen Punkten.
 *
 * Klicken und Ziehen legt Mittelpunkt und Größe fest; ein weiterer Zug auf
 * dem bereits gezeichneten Marker verschiebt ihn, ohne die Größe zu ändern.
 * Die Position hat bewusst keine Verbindung zu den drei Dropdowns - sie wird
 * unabhängig davon gespeichert.
 */
export function FreihandKarte({
  wert,
  onWahl,
}: {
  wert: FreihandMarker | null;
  onWahl: (wert: FreihandMarker | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ziehModus, setZiehModus] = useState<"zeichnen" | "verschieben" | null>(null);
  const versatzPx = useRef({ dx: 0, dy: 0 });

  function ausEvent(e: ReactPointerEvent<HTMLDivElement>) {
    const box = containerRef.current!.getBoundingClientRect();
    return { xPx: e.clientX - box.left, yPx: e.clientY - box.top, breitePx: box.width, hoehePx: box.height };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const { xPx, yPx, breitePx, hoehePx } = ausEvent(e);

    if (wert) {
      const zentrumXPx = (wert.x / 100) * breitePx;
      const zentrumYPx = (wert.y / 100) * hoehePx;
      const radiusPx = (wert.radius / 100) * breitePx;
      if (Math.hypot(xPx - zentrumXPx, yPx - zentrumYPx) <= radiusPx) {
        setZiehModus("verschieben");
        versatzPx.current = { dx: xPx - zentrumXPx, dy: yPx - zentrumYPx };
        containerRef.current?.setPointerCapture(e.pointerId);
        return;
      }
    }

    setZiehModus("zeichnen");
    onWahl({ x: (xPx / breitePx) * 100, y: (yPx / hoehePx) * 100, radius: MINDESTRADIUS });
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!ziehModus || !wert) return;
    const { xPx, yPx, breitePx, hoehePx } = ausEvent(e);

    if (ziehModus === "verschieben") {
      onWahl({
        x: begrenzen(((xPx - versatzPx.current.dx) / breitePx) * 100, 0, 100),
        y: begrenzen(((yPx - versatzPx.current.dy) / hoehePx) * 100, 0, 100),
        radius: wert.radius,
      });
      return;
    }

    const zentrumXPx = (wert.x / 100) * breitePx;
    const zentrumYPx = (wert.y / 100) * hoehePx;
    const radiusPx = Math.hypot(xPx - zentrumXPx, yPx - zentrumYPx);
    onWahl({ ...wert, radius: Math.max(MINDESTRADIUS, (radiusPx / breitePx) * 100) });
  }

  function handlePointerEnde() {
    setZiehModus(null);
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnde}
        onPointerCancel={handlePointerEnde}
        className="relative mx-auto w-full max-w-[720px] touch-none select-none"
      >
        <div style={{ paddingTop: `${(KOERPERKARTE_HOEHE / KOERPERKARTE_BREITE) * 100}%` }} />
        <img
          src="/koerperkarte-leer.webp"
          alt=""
          width={KOERPERKARTE_BREITE}
          height={KOERPERKARTE_HOEHE}
          className={cn(
            "absolute inset-0 size-full rounded-lg border border-border-strong",
            wert ? (ziehModus === "verschieben" ? "cursor-grabbing" : "cursor-default") : "cursor-crosshair",
          )}
          draggable={false}
        />
        {wert && (
          <div
            aria-hidden="true"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-destructive bg-destructive/15",
              ziehModus === "verschieben" ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{
              left: `${wert.x}%`,
              top: `${wert.y}%`,
              width: `${wert.radius * 2}%`,
              height: `${wert.radius * 2 * HOEHENFAKTOR}%`,
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {wert
            ? "Auf den Marker ziehen, um ihn zu verschieben. An freier Stelle klicken und ziehen, um ihn neu zu zeichnen."
            : "Auf das Bild klicken und ziehen, um die Wundstelle einzuzeichnen."}
        </p>
        {wert && (
          <Button type="button" variant="outline" size="sm" onClick={() => onWahl(null)}>
            <X aria-hidden="true" />
            Marker löschen
          </Button>
        )}
      </div>
    </div>
  );
}
