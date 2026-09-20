"use client";

import type { ReactNode } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";

/**
 * Sichtbare Zoom-Bedienelemente (wie bei PDF-Betrachtern ueblich) zusaetzlich
 * zu Pinch/Mausrad/Ziehen - `useControls` braucht den Kontext von
 * `TransformWrapper`, muss also innerhalb davon gerendert werden.
 */
function ZoomKnoepfe() {
  const { zoomIn, zoomOut, fitToView } = useControls();
  const knopf = "text-white hover:bg-white/10 hover:text-white";
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-white/15 bg-slate-950/90 p-1 shadow-lg backdrop-blur">
      <Button type="button" size="icon" variant="ghost" className={knopf} onClick={() => zoomOut()} aria-label="Verkleinern">
        <Minus aria-hidden="true" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className={knopf} onClick={() => fitToView()} aria-label="An Fenster anpassen">
        <Scan aria-hidden="true" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className={knopf} onClick={() => zoomIn()} aria-label="Vergrößern">
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Zoom-/Verschiebe-Rahmen fuer die Dokumentvorschau (Rezepte, Arztbriefe -
 * Fotos wie PDF-Seiten). Startet immer eingepasst (`fitOnInit`) - Touch:
 * Pinch, Desktop: Mausrad, Ziehen und die eingeblendeten Knoepfe. `minScale`
 * bleibt bewusst weit unter 1, sonst wuerde er das automatische Einpassen
 * grosser Inhalte (Skalierung oft < 1) verhindern.
 *
 * `smooth: false` + kleiner `step`: Die Bibliothek multipliziert `step`
 * standardmaessig mit dem rohen `deltaY` des Mausrad-Events (`smooth: true`)
 * - bei einer normalen Maus (deltaY oft ~100 pro Rastung) ergab das mit dem
 * Standardschritt einen Sprung von uebers ganze Zoom-Spektrum bei einer
 * einzigen Rastung. Ohne `smooth` zaehlt nur `step` selbst pro Ereignis.
 *
 * Pinch-Zoom wird bewusst per JavaScript berechnet (nicht dem nativen
 * Viewport-Zoom des Browsers ueberlassen): In einem `position: fixed`-Popup
 * wie diesem funktioniert iOS' eigene Pinch-Zoom-Geste nicht - sie wird dort
 * stattdessen als Multitasking-Geste interpretiert.
 */
export function ZoomVorschau({ children }: { children: ReactNode }) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.05}
      maxScale={8}
      fitOnInit
      centerOnInit
      smooth={false}
      wheel={{ step: 0.08 }}
      doubleClick={{ mode: "toggle" }}
      panning={{ velocityDisabled: true }}
    >
      <div className="relative size-full">
        <ZoomKnoepfe />
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          {children}
        </TransformComponent>
      </div>
    </TransformWrapper>
  );
}
