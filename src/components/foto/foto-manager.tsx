"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FileImage,
  Images,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FotoGalerie } from "./foto-galerie";
import {
  fotoBeschreibungAendern,
  fotoLoeschen,
  fotosHochladen,
  fotosSortieren,
} from "@/actions/fotos";
import { erzeugeClientId } from "@/lib/client-id";
import { FOTO_MAX_BYTES, type FotoAnsicht } from "@/lib/foto-typen";

type NeueDatei = {
  id: string;
  datei: File;
  vorschau: string | null;
  beschreibung: string;
};

function istVorschaubar(datei: File): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(datei.type);
}

export type FotoManagerHandle = {
  anzahlAusstehend: () => number;
  hochladen: () => Promise<boolean>;
};

export const FotoManager = forwardRef<FotoManagerHandle, {
  aufnahmeId: string | null;
  initialFotos: FotoAnsicht[];
  entwurfSicherstellen: () => Promise<string | null>;
  onAufnahmeId: (id: string) => void;
}>(function FotoManager({
  aufnahmeId,
  initialFotos,
  entwurfSicherstellen,
  onAufnahmeId,
}, ref) {
  const [fotos, setFotos] = useState(initialFotos);
  const [auswahl, setAuswahl] = useState<NeueDatei[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [aktiveAktion, setAktiveAktion] = useState<string | null>(null);
  const dateiInput = useRef<HTMLInputElement>(null);
  const kameraInput = useRef<HTMLInputElement>(null);
  const objektUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objektUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  function dateienHinzufuegen(dateien: File[]) {
    setFehler(null);
    const gueltig: NeueDatei[] = [];
    for (const datei of dateien) {
      if (datei.size > FOTO_MAX_BYTES) {
        setFehler(`${datei.name}: Ein Foto darf höchstens 15 MB groß sein.`);
        continue;
      }
      const vorschau = istVorschaubar(datei) ? URL.createObjectURL(datei) : null;
      if (vorschau) objektUrls.current.add(vorschau);
      gueltig.push({
        id: erzeugeClientId(),
        datei,
        vorschau,
        beschreibung: "",
      });
    }
    const frei = Math.max(0, 8 - auswahl.length);
    const aufgenommen = gueltig.slice(0, frei);
    const verworfen = gueltig.slice(frei);
    for (const datei of verworfen) {
      if (datei.vorschau) {
        URL.revokeObjectURL(datei.vorschau);
        objektUrls.current.delete(datei.vorschau);
      }
    }
    if (verworfen.length > 0) setFehler("Pro Upload sind höchstens 8 Fotos möglich.");
    setAuswahl((alt) => [...alt, ...aufgenommen]);
  }

  function entfernen(id: string) {
    setAuswahl((alt) => {
      const eintrag = alt.find((datei) => datei.id === id);
      if (eintrag?.vorschau) {
        URL.revokeObjectURL(eintrag.vorschau);
        objektUrls.current.delete(eintrag.vorschau);
      }
      return alt.filter((datei) => datei.id !== id);
    });
  }

  async function hochladen(): Promise<boolean> {
    if (auswahl.length === 0) return true;
    setLaedt(true);
    setFehler(null);

    const zielId = aufnahmeId ?? (await entwurfSicherstellen());
    if (!zielId) {
      setFehler("Der Aufnahmeentwurf konnte nicht angelegt werden.");
      setLaedt(false);
      return false;
    }
    onAufnahmeId(zielId);

    const fd = new FormData();
    for (const eintrag of auswahl) {
      fd.append("fotos", eintrag.datei);
      fd.append("beschreibungen", eintrag.beschreibung);
    }
    const ergebnis = await fotosHochladen(zielId, fd);
    setLaedt(false);
    if (!ergebnis.erfolg) {
      setFehler(ergebnis.fehler);
      return false;
    }

    for (const eintrag of auswahl) {
      if (eintrag.vorschau) {
        URL.revokeObjectURL(eintrag.vorschau);
        objektUrls.current.delete(eintrag.vorschau);
      }
    }
    setAuswahl([]);
    setFotos(ergebnis.fotos);
    return true;
  }

  useImperativeHandle(ref, () => ({
    anzahlAusstehend: () => auswahl.length,
    hochladen,
  }));

  async function beschreibungSpeichern(fotoId: string, wert: string) {
    const vorher = fotos.find((foto) => foto.id === fotoId)?.beschreibung ?? "";
    if (vorher === wert) return;
    setFotos((alt) => alt.map((foto) => foto.id === fotoId ? { ...foto, beschreibung: wert } : foto));
    setAktiveAktion(fotoId);
    const ergebnis = await fotoBeschreibungAendern(fotoId, wert);
    setAktiveAktion(null);
    if (!ergebnis.erfolg) {
      setFotos((alt) => alt.map((foto) => foto.id === fotoId ? { ...foto, beschreibung: vorher } : foto));
      setFehler(ergebnis.fehler);
    }
  }

  async function verschieben(index: number, delta: -1 | 1) {
    const ziel = index + delta;
    if (ziel < 0 || ziel >= fotos.length || !aufnahmeId) return;
    const vorher = fotos;
    const neu = [...fotos];
    [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
    setFotos(neu);
    setAktiveAktion("sortieren");
    const ergebnis = await fotosSortieren(aufnahmeId, neu.map((foto) => foto.id));
    setAktiveAktion(null);
    if (!ergebnis.erfolg) {
      setFotos(vorher);
      setFehler(ergebnis.fehler);
    }
  }

  async function loeschen(fotoId: string) {
    if (!window.confirm("Dieses Wundfoto aus der Dokumentation entfernen? Es bleibt für die Wiederherstellung erhalten.")) return;
    setAktiveAktion(fotoId);
    const ergebnis = await fotoLoeschen(fotoId);
    setAktiveAktion(null);
    if (ergebnis.erfolg) setFotos((alt) => alt.filter((foto) => foto.id !== fotoId));
    else setFehler(ergebnis.fehler);
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border-2 border-dashed border-border-strong bg-surface-muted/50 p-5 text-center transition-colors hover:border-primary/60 sm:p-8"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          dateienHinzufuegen(Array.from(event.dataTransfer.files));
        }}
      >
        <Images className="mx-auto size-10 text-primary" aria-hidden="true" />
        <p className="mt-3 font-medium">Wundfotos hinzufügen</p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          JPEG, PNG, WebP oder HEIC · maximal 15 MB je Foto. Standort- und Kameradaten werden beim Speichern entfernt.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="outline" data-autosave-ignore onClick={() => dateiInput.current?.click()}>
            <Upload aria-hidden="true" />Fotos auswählen
          </Button>
          <Button type="button" data-autosave-ignore onClick={() => kameraInput.current?.click()}>
            <Camera aria-hidden="true" />Kamera öffnen
          </Button>
        </div>
        <input
          ref={dateiInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Fotos auswählen"
          onChange={(event) => dateienHinzufuegen(Array.from(event.target.files ?? []))}
        />
        <input
          ref={kameraInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label="Foto mit der Kamera aufnehmen"
          onChange={(event) => dateienHinzufuegen(Array.from(event.target.files ?? []))}
        />
      </div>

      {auswahl.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Bereit zum Hochladen ({auswahl.length})</h3>
            <Button type="button" data-autosave-ignore onClick={() => void hochladen()} disabled={laedt}>
              {laedt ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {laedt ? "Fotos werden geschützt verarbeitet …" : "Fotos hochladen"}
            </Button>
          </div>
          <div className="panel-grid gap-4">
            {auswahl.map((eintrag) => (
              <div key={eintrag.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted sm:size-24">
                  {eintrag.vorschau ? (
                    <img src={eintrag.vorschau} alt="Vorschau des ausgewählten Fotos" className="size-full object-cover" />
                  ) : (
                    <FileImage className="size-8 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{eintrag.datei.name}</p>
                    <Button type="button" size="icon" variant="ghost" data-autosave-ignore className="-mr-2 -mt-2" onClick={() => entfernen(eintrag.id)} aria-label="Auswahl entfernen">
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  <Input
                    value={eintrag.beschreibung}
                    maxLength={500}
                    placeholder="Beschreibung, z. B. Gesamtansicht"
                    aria-label={`Beschreibung für ${eintrag.datei.name}`}
                    onChange={(event) => setAuswahl((alt) => alt.map((datei) => datei.id === eintrag.id ? { ...datei, beschreibung: event.target.value } : datei))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fehler && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">{fehler}</p>}

      {fotos.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Gespeicherte Fotos ({fotos.length})</h3>
          <FotoGalerie fotos={fotos} />
          <ol className="space-y-2">
            {fotos.map((foto, index) => (
              <li key={foto.id} className="grid items-center gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[auto_1fr_auto]">
                <span className="tabular flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-on-secondary">{index + 1}</span>
                <Input
                  key={foto.beschreibung}
                  defaultValue={foto.beschreibung}
                  maxLength={500}
                  aria-label={`Beschreibung für Foto ${index + 1}`}
                  onBlur={(event) => void beschreibungSpeichern(foto.id, event.target.value)}
                />
                <div className="flex gap-1">
                  {aktiveAktion === foto.id && <Loader2 className="m-3 size-4 animate-spin text-muted-foreground" aria-label="Wird gespeichert" />}
                  <Button type="button" size="icon" variant="ghost" data-autosave-ignore disabled={index === 0 || aktiveAktion === "sortieren"} onClick={() => void verschieben(index, -1)} aria-label="Foto nach vorne verschieben">
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" data-autosave-ignore disabled={index === fotos.length - 1 || aktiveAktion === "sortieren"} onClick={() => void verschieben(index, 1)} aria-label="Foto nach hinten verschieben">
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" data-autosave-ignore onClick={() => void loeschen(foto.id)} aria-label="Foto löschen" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {fotos.length === 0 && auswahl.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Noch keine Fotos zu dieser Aufnahme.</p>
      )}
    </div>
  );
});
