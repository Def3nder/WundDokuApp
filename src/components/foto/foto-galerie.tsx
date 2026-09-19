"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FotoAnsicht } from "@/lib/foto-typen";
import { cn } from "@/lib/utils";

function bildtext(foto: FotoAnsicht, index: number): string {
  return foto.beschreibung || `Wundfoto ${index + 1}`;
}

export function FotoGalerie({ fotos, kompakt = false }: { fotos: FotoAnsicht[]; kompakt?: boolean }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const ausloeser = useRef<HTMLButtonElement | null>(null);
  const foto = aktiv == null ? null : fotos[aktiv];

  if (fotos.length === 0) return null;

  return (
    <>
      <div className={cn("grid gap-4 sm:grid-cols-2", !kompakt && "lg:grid-cols-3")}>
        {fotos.map((eintrag, index) => (
          <figure key={eintrag.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={(event) => {
                ausloeser.current = event.currentTarget;
                setAktiv(index);
              }}
              className="group relative block w-full cursor-zoom-in overflow-hidden bg-surface-muted"
              style={{ aspectRatio: `${eintrag.breite}/${eintrag.hoehe}` }}
              aria-label={`${bildtext(eintrag, index)} vergrößern`}
            >
              <img
                src={eintrag.thumbnailUrl}
                alt={bildtext(eintrag, index)}
                width={eintrag.breite}
                height={eintrag.hoehe}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur">
                <Expand className="size-4" aria-hidden="true" />
              </span>
            </button>
            <figcaption className="p-3 text-sm">
              <p className="font-medium text-foreground">{bildtext(eintrag, index)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {eintrag.breite} × {eintrag.hoehe} px
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

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
            <Dialog.Title className="sr-only">Wundfoto vergrößert</Dialog.Title>
            <Dialog.Description className="sr-only">
              Vergrößerte Ansicht mit Navigation zwischen den Fotos
            </Dialog.Description>

            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-medium">
                {foto && bildtext(foto, aktiv ?? 0)}
              </p>
              <Dialog.Close asChild>
                <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" aria-label="Lightbox schließen">
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
              {foto && (
                <img
                  src={foto.url}
                  alt={bildtext(foto, aktiv ?? 0)}
                  width={foto.breite}
                  height={foto.hoehe}
                  className="max-h-full max-w-full object-contain"
                />
              )}

              {fotos.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:left-4"
                    onClick={() => setAktiv((aktiv ?? 0) === 0 ? fotos.length - 1 : (aktiv ?? 0) - 1)}
                    aria-label="Vorheriges Foto"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:right-4"
                    onClick={() => setAktiv(((aktiv ?? 0) + 1) % fotos.length)}
                    aria-label="Nächstes Foto"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>

            {foto?.beschreibung && (
              <p className="border-t border-white/15 px-4 py-3 text-center text-sm text-white/80">
                {foto.beschreibung}
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
