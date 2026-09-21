"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Download, FileText, Loader2, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ZoomVorschau } from "@/components/patient/zoom-vorschau";

const PdfVorschau = dynamic(
  () => import("@/components/patient/pdf-vorschau").then((mod) => mod.PdfVorschau),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-white/70" aria-hidden="true" />
      </div>
    ),
  },
);

export type DokumentEintrag = {
  id: string;
  titel: string;
  dateiname: string;
  mimeType: string;
  createdAt: Date;
};

/**
 * Ersetzt das frühere `<a target="_blank">` - Rezepte und Arztbriefe öffnen
 * sich als Popup statt in einem neuen Browserfenster. PDFs werden über
 * `react-pdf` gerendert (Seite fuer Seite, per Web Worker) und wie Fotos
 * (JPEG/PNG/WebP) in `ZoomVorschau` gezeigt.
 *
 * Bewusst kein `<iframe>` auf die native Browser-PDF-Anzeige: In diesem
 * `position: fixed`-Popup funktioniert iOS' eigenes Pinch-Zoom nicht (wird
 * als Multitasking-Geste interpretiert) - das eigene, JavaScript-gesteuerte
 * Zoomen in `ZoomVorschau` ist deshalb auf allen Geraeten zuverlaessig.
 */
export function DokumentListe({
  dokumente,
  typ,
  dokumentLoeschen,
}: {
  dokumente: readonly DokumentEintrag[];
  typ: "REZEPT" | "ARZTBRIEF";
  dokumentLoeschen: (dokumentId: string) => Promise<void>;
}) {
  const [aktiv, setAktiv] = useState<DokumentEintrag | null>(null);
  const ausloeser = useRef<HTMLButtonElement | null>(null);
  const Icon = typ === "REZEPT" ? ReceiptText : FileText;
  const istPdf = aktiv?.mimeType === "application/pdf";
  const url = aktiv ? `/api/documents/${aktiv.id}` : null;

  return (
    <>
      <ul className="space-y-3">
        {dokumente.map((dokument) => (
          <li key={dokument.id}>
            <Card className="hover:border-primary">
              <CardContent className="flex items-center gap-2 p-0">
                <button
                  type="button"
                  onClick={(event) => {
                    ausloeser.current = event.currentTarget;
                    setAktiv(dokument);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-l-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{dokument.titel}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {dokument.dateiname} · {dokument.mimeType === "application/pdf" ? "PDF" : "Foto"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground tabular">
                      Hinzugefügt am {dokument.createdAt.toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <form action={dokumentLoeschen.bind(null, dokument.id)} className="pr-3">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`${dokument.titel} löschen`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog.Root open={aktiv != null} onOpenChange={(offen) => !offen && setAktiv(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content
            className="media-dialog fixed z-50 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950 text-white shadow-2xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              ausloeser.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">{aktiv?.titel ?? "Dokumentvorschau"}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Vorschau des ausgewählten Dokuments
            </Dialog.Description>

            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-medium">{aktiv?.titel}</p>
              <div className="flex shrink-0 items-center gap-1">
                {url && (
                  <Button
                    asChild
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                  >
                    <a href={`${url}?download=1`} download={aktiv?.dateiname} aria-label={`${aktiv?.titel} herunterladen`}>
                      <Download aria-hidden="true" />
                    </a>
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    aria-label="Vorschau schließen"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {url && istPdf && <PdfVorschau key={aktiv?.id} url={url} />}
              {url && !istPdf && (
                <div className="h-full p-3 sm:p-6">
                  <ZoomVorschau key={aktiv?.id}>
                    <img
                      src={url}
                      alt={aktiv?.titel ?? ""}
                      className="max-h-full max-w-full"
                      draggable={false}
                    />
                  </ZoomVorschau>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
