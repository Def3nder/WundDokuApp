"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Download, FileText, Loader2, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PdfVorschau = dynamic(
  () => import("@/components/patient/pdf-vorschau").then((mod) => mod.PdfVorschau),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
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
 * `react-pdf` gerendert (Seite fuer Seite, per Web Worker), alles andere
 * (Foto-Upload als JPEG/PNG/WebP) als Bild.
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
            className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950 text-white shadow-2xl sm:inset-8"
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

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {url && istPdf && (
                <div className="p-3 sm:p-6">
                  <PdfVorschau url={url} />
                </div>
              )}
              {url && !istPdf && (
                <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
                  <img src={url} alt={aktiv?.titel ?? ""} className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
