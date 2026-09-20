"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZoomVorschau } from "@/components/patient/zoom-vorschau";

/**
 * Muss auf ein tatsaechliches Worker-Skript zeigen (pdf.js rendert Seiten in
 * einem Web Worker). `import.meta.url` laesst Turbopack/Webpack die Datei als
 * eigenes Asset ausliefern, ohne einen zusaetzlichen statischen Pfad pflegen
 * zu muessen.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Bevorzugte Aufloesung fuer gute Lesbarkeit beim Hineinzoomen. Wird pro
 * Dokument gegen `MAX_DIMENSION`/`MAX_FLAECHE` gedeckelt.
 */
const BEVORZUGTE_SKALA = 2.5;
/**
 * Sicherheitsgrenzen fuer die tatsaechlich gerenderte Canvas-Groesse: iOS
 * Safari liefert bei zu grossen Canvas-Flaechen/-Kantenlaengen
 * stillschweigend ein leeres Bild statt eines Fehlers. Eine ungewoehnlich
 * hohe Testseite (eine als PDF gedruckte Webseite, weit ueber A4-Format) hat
 * das ausgeloest. Die genauen Geraetegrenzen sind nicht dokumentiert - diese
 * Werte liegen bewusst konservativ darunter.
 */
const MAX_KANTE = 4000;
const MAX_FLAECHE = 16_000_000;

/**
 * `react-pdf` multipliziert die uebergebene `scale` intern zusaetzlich mit
 * `window.devicePixelRatio` (fuer scharfe Darstellung auf hochaufloesenden
 * Bildschirmen) - auf Geraeten mit Ratio > 1 (z.B. iPad: 2) waere die
 * tatsaechliche Canvas sonst entsprechend groesser als hier berechnet.
 * Deshalb hier explizit gegenrechnen, statt nur die nominale Skala zu
 * deckeln.
 */
function sichereSkala(breite: number, hoehe: number, pixelVerhaeltnis: number): number {
  const faktor = Math.max(pixelVerhaeltnis, 1);
  const kantenGrenze = MAX_KANTE / (Math.max(breite, hoehe) * faktor);
  const flaechenGrenze = Math.sqrt(MAX_FLAECHE / (breite * hoehe)) / faktor;
  return Math.min(BEVORZUGTE_SKALA, kantenGrenze, flaechenGrenze);
}

/** Zeigt eine PDF-Seite eingepasst und zoombar an, mit Seitenblaettern bei mehreren Seiten. */
export function PdfVorschau({ url }: { url: string }) {
  const [seite, setSeite] = useState(1);
  const [seitenzahl, setSeitenzahl] = useState<number | null>(null);
  const [renderSkala, setRenderSkala] = useState<number | null>(null);
  const [fehler, setFehler] = useState(false);
  const [pixelVerhaeltnis] = useState(() => window.devicePixelRatio || 1);

  if (fehler) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-white/80">
        <TriangleAlert className="size-8" aria-hidden="true" />
        <p className="text-sm">Die PDF-Datei konnte nicht angezeigt werden.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-6">
        <Document
          file={url}
          onLoadSuccess={async (pdf) => {
            setSeitenzahl(pdf.numPages);
            const ersteSeite = await pdf.getPage(1);
            const { width, height } = ersteSeite.getViewport({ scale: 1 });
            setRenderSkala(sichereSkala(width, height, pixelVerhaeltnis));
          }}
          onLoadError={() => setFehler(true)}
          loading={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-white/70" aria-hidden="true" />
            </div>
          }
          className="h-full"
        >
          {renderSkala != null && (
            <ZoomVorschau key={seite}>
              <Page
                pageNumber={seite}
                scale={renderSkala}
                devicePixelRatio={pixelVerhaeltnis}
                loading=""
                // `getTextContent()` (fuer Textauswahl/Suche) nutzt intern einen
                // `ReadableStream` mit asynchroner Iteration - Safari/WebKit
                // (iPad) unterstuetzt das teilweise nicht vollstaendig und
                // stuerzt dabei ab. Fuer eine reine Vorschau (Original bleibt
                // ueber den Download-Knopf erreichbar) ist die Textebene
                // ohnehin verzichtbar.
                renderTextLayer={false}
              />
            </ZoomVorschau>
          )}
        </Document>
      </div>

      {seitenzahl != null && seitenzahl > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-4 border-t border-white/15 py-2 text-sm text-white/80">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setSeite((s) => Math.max(1, s - 1))}
            disabled={seite <= 1}
            aria-label="Vorherige Seite"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="tabular">
            Seite {seite} von {seitenzahl}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setSeite((s) => Math.min(seitenzahl, s + 1))}
            disabled={seite >= seitenzahl}
            aria-label="Nächste Seite"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
