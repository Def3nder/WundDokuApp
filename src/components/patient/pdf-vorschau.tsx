"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Loader2, TriangleAlert } from "lucide-react";

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

/** Zeigt alle Seiten eines PDF-Dokuments untereinander an, auf die Breite des Popups skaliert. */
export function PdfVorschau({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [breite, setBreite] = useState(0);
  const [seitenzahl, setSeitenzahl] = useState<number | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const beobachter = new ResizeObserver((eintraege) => {
      const breiteNeu = eintraege[0]?.contentRect.width;
      if (breiteNeu) setBreite(Math.floor(breiteNeu));
    });
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, []);

  if (fehler) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-white/80">
        <TriangleAlert className="size-8" aria-hidden="true" />
        <p className="text-sm">Die PDF-Datei konnte nicht angezeigt werden.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setSeitenzahl(numPages)}
        onLoadError={() => setFehler(true)}
        loading={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/70" aria-hidden="true" />
          </div>
        }
        className="flex w-full flex-col items-center gap-4"
      >
        {seitenzahl != null && breite > 0 &&
          Array.from({ length: seitenzahl }, (_, index) => (
            <Page
              key={index}
              pageNumber={index + 1}
              width={breite}
              className="overflow-hidden rounded-lg shadow-lg"
              loading=""
            />
          ))}
      </Document>
    </div>
  );
}
