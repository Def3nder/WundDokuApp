"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { KoerperKarte, type LokalisationWahl } from "@/components/formular/koerperkarte";
import { FreihandKarte, type FreihandMarker } from "@/components/formular/freihand-karte";
import {
  AUSRICHTUNGEN,
  DIAGNOSE_TYPEN,
  KOERPERREGIONEN,
  SEITEN,
  ZEITEINHEITEN,
} from "@/lib/enums";
import type { FormZustand } from "@/actions/patienten";
import { lokalisationsAnzeigeSetzen } from "@/actions/wunden";

const START: FormZustand = {};

export type WundeWerte = {
  bezeichnung: string;
  diagnoseTyp: string;
  diagnoseFreitext: string;
  arztId: string;
  pflegedienstId: string;
  lokalisationRegion: string;
  lokalisationSeite: string;
  lokalisationAusrichtung: string;
  lokalisationFreitext: string;
  lokalisationMarkerX: string;
  lokalisationMarkerY: string;
  lokalisationMarkerRadius: string;
  bestehtSeitWert: string;
  bestehtSeitEinheit: string;
  rezidiv: boolean;
  rezidivAnzahl: string;
};

const LEER: WundeWerte = {
  bezeichnung: "",
  diagnoseTyp: "",
  diagnoseFreitext: "",
  arztId: "",
  pflegedienstId: "",
  lokalisationRegion: "",
  lokalisationSeite: "",
  lokalisationAusrichtung: "",
  lokalisationFreitext: "",
  lokalisationMarkerX: "",
  lokalisationMarkerY: "",
  lokalisationMarkerRadius: "",
  bestehtSeitWert: "",
  bestehtSeitEinheit: "MONATE",
  rezidiv: false,
  rezidivAnzahl: "",
};

export function WundeFormular({
  action,
  vorgabe = LEER,
  abbrechenNach,
  absendeText = "Speichern",
  aerzte = [],
  pflegedienste = [],
  anzeigeModus = "KARTE",
}: {
  action: (zustand: FormZustand, fd: FormData) => Promise<FormZustand>;
  vorgabe?: WundeWerte;
  abbrechenNach: string;
  absendeText?: string;
  aerzte?: { id: string; name: string; praxis: string | null }[];
  pflegedienste?: { id: string; name: string }[];
  /** Zuletzt gewählte Anzeigeart der Lokalisation, pro Benutzer gemerkt. */
  anzeigeModus?: string;
}) {
  const [zustand, formAction, laeuft] = useActionState(action, START);
  const [rezidiv, setRezidiv] = useState(vorgabe.rezidiv);

  const w = (feld: keyof WundeWerte) =>
    (zustand.werte?.[feld] as string | undefined) ?? String(vorgabe[feld] ?? "");
  const f = (feld: string) => zustand.fehler?.[feld];

  // Nach jedem Absenden (auch bei einem Fehler) setzt React/Next.js die
  // <select>- und Checkbox-DOM-Knoten dieses Formulars auf ihren
  // Ursprungszustand zurueck, OHNE dass React das bei einem unveraenderten
  // value/checked-Prop bemerkt - der interne Zustand bleibt korrekt, nur die
  // tatsaechlich angezeigte Eingabe faellt sichtbar auf "keine Auswahl"
  // zurueck. Ein wechselnder `key` auf dem <form> erzwingt bei jedem neuen
  // Ergebnis von `zustand` einen echten Neuaufbau des Baums - die frischen
  // Felder lesen dann wieder korrekt aus `w()`/lokalem State.
  const zustandGeneration = useRef(0);
  const vorherigerZustand = useRef(zustand);
  if (vorherigerZustand.current !== zustand) {
    zustandGeneration.current += 1;
    vorherigerZustand.current = zustand;
  }

  const [auswahl, setAuswahl] = useState({
    diagnoseTyp: w("diagnoseTyp"),
    arztId: w("arztId"),
    pflegedienstId: w("pflegedienstId"),
    bestehtSeitEinheit: w("bestehtSeitEinheit"),
  });
  const waehle = (feld: keyof typeof auswahl) => (e: ChangeEvent<HTMLSelectElement>) =>
    setAuswahl((a) => ({ ...a, [feld]: e.target.value }));

  const [lokalisation, setLokalisation] = useState<LokalisationWahl>({
    region: w("lokalisationRegion"),
    seite: w("lokalisationSeite"),
    ausrichtung: w("lokalisationAusrichtung"),
  });

  const [modus, setModus] = useState<"KARTE" | "FREIHAND">(
    anzeigeModus === "FREIHAND" ? "FREIHAND" : "KARTE",
  );
  const [freihandMarker, setFreihandMarker] = useState<FreihandMarker | null>(() => {
    const x = Number.parseFloat(w("lokalisationMarkerX"));
    const y = Number.parseFloat(w("lokalisationMarkerY"));
    const radius = Number.parseFloat(w("lokalisationMarkerRadius"));
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(radius)
      ? { x, y, radius }
      : null;
  });

  function modusWaehlen(neu: "KARTE" | "FREIHAND") {
    setModus(neu);
    // Reine Anzeige-Vorliebe, kein Formularfeld - Fehler dabei sind nicht
    // kritisch und werden bewusst nicht dem Nutzer gemeldet.
    lokalisationsAnzeigeSetzen(neu).catch(() => {});
  }

  return (
    <form key={zustandGeneration.current} action={formAction} className="space-y-6" noValidate>
      <FehlerUebersicht fehler={zustand.fehler} />

      {zustand.meldung && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {zustand.meldung}
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Diagnose</h2>

          <Field
            id="bezeichnung"
            label="Kurzbezeichnung"
            pflicht
            hilfe="Erscheint in Listen, z. B. „Ulcus cruris links lateral“"
            fehler={f("bezeichnung")}
          >
            {(p) => <Input {...p} name="bezeichnung" defaultValue={w("bezeichnung")} required />}
          </Field>

          <Field id="diagnoseTyp" label="Diagnose" pflicht fehler={f("diagnoseTyp")}>
            {(p) => (
              <Select
                {...p}
                name="diagnoseTyp"
                value={auswahl.diagnoseTyp}
                onChange={waehle("diagnoseTyp")}
                required
              >
                <option value="">Bitte auswählen …</option>
                {DIAGNOSE_TYPEN.map((d) => (
                  <option key={d.wert} value={d.wert}>
                    {d.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="diagnoseFreitext"
            label="Ergänzung zur Diagnose"
            hilfe="Ursache, Vorbefunde oder andere Hinweise"
            fehler={f("diagnoseFreitext")}
          >
            {(p) => (
              <Textarea {...p} name="diagnoseFreitext" rows={2} defaultValue={w("diagnoseFreitext")} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Versorgungspartner</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="arztId" label="Arzt" fehler={f("arztId")}>
              {(p) => <Select {...p} name="arztId" value={auswahl.arztId} onChange={waehle("arztId")}>
                <option value="">Kein Arzt ausgewählt</option>
                {aerzte.map((arzt) => <option key={arzt.id} value={arzt.id}>{arzt.name}{arzt.praxis ? ` · ${arzt.praxis}` : ""}</option>)}
              </Select>}
            </Field>
            <Field id="pflegedienstId" label="Pflegedienst" fehler={f("pflegedienstId")}>
              {(p) => <Select {...p} name="pflegedienstId" value={auswahl.pflegedienstId} onChange={waehle("pflegedienstId")}>
                <option value="">Kein Pflegedienst ausgewählt</option>
                {pflegedienste.map((dienst) => <option key={dienst.id} value={dienst.id}>{dienst.name}</option>)}
              </Select>}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Lokalisation</h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="lokalisationRegion" label="Körperregion" fehler={f("lokalisationRegion")}>
              {(p) => (
                <Select
                  {...p}
                  name="lokalisationRegion"
                  value={lokalisation.region}
                  onChange={(e) =>
                    setLokalisation((l) => ({ ...l, region: e.target.value }))
                  }
                >
                  <option value="">Keine Angabe</option>
                  {KOERPERREGIONEN.map((r) => (
                    <option key={r.wert} value={r.wert}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field id="lokalisationSeite" label="Seite" fehler={f("lokalisationSeite")}>
              {(p) => (
                <Select
                  {...p}
                  name="lokalisationSeite"
                  value={lokalisation.seite}
                  onChange={(e) =>
                    setLokalisation((l) => ({ ...l, seite: e.target.value }))
                  }
                >
                  <option value="">Keine Angabe</option>
                  {SEITEN.map((s) => (
                    <option key={s.wert} value={s.wert}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              id="lokalisationAusrichtung"
              label="Ausrichtung"
              fehler={f("lokalisationAusrichtung")}
            >
              {(p) => (
                <Select
                  {...p}
                  name="lokalisationAusrichtung"
                  value={lokalisation.ausrichtung}
                  onChange={(e) =>
                    setLokalisation((l) => ({ ...l, ausrichtung: e.target.value }))
                  }
                >
                  <option value="">Keine Angabe</option>
                  {AUSRICHTUNGEN.map((a) => (
                    <option key={a.wert} value={a.wert}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="space-y-3">
            <div
              role="group"
              aria-label="Anzeigeart der Lokalisationshilfe"
              className="inline-flex rounded-lg border border-border-strong p-1"
            >
              <button
                type="button"
                aria-pressed={modus === "KARTE"}
                onClick={() => modusWaehlen("KARTE")}
                className={cn(
                  "tippziel rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                  modus === "KARTE"
                    ? "bg-secondary text-on-secondary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Körperkarte
              </button>
              <button
                type="button"
                aria-pressed={modus === "FREIHAND"}
                onClick={() => modusWaehlen("FREIHAND")}
                className={cn(
                  "tippziel rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                  modus === "FREIHAND"
                    ? "bg-secondary text-on-secondary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Frei einzeichnen
              </button>
            </div>

            {modus === "KARTE" ? (
              <KoerperKarte wert={lokalisation} onWahl={setLokalisation} />
            ) : (
              <FreihandKarte wert={freihandMarker} onWahl={setFreihandMarker} />
            )}

            <input type="hidden" name="lokalisationMarkerX" value={freihandMarker?.x ?? ""} />
            <input type="hidden" name="lokalisationMarkerY" value={freihandMarker?.y ?? ""} />
            <input
              type="hidden"
              name="lokalisationMarkerRadius"
              value={freihandMarker?.radius ?? ""}
            />
          </div>

          <Field
            id="lokalisationFreitext"
            label="Genauere Beschreibung"
            hilfe="Ergänzt die Auswahl, z. B. „handbreit oberhalb des Innenknöchels“"
            fehler={f("lokalisationFreitext")}
          >
            {(p) => (
              <Input {...p} name="lokalisationFreitext" defaultValue={w("lokalisationFreitext")} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-base font-semibold">Verlauf</h2>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium">Wunde besteht seit</legend>
            <div className="flex gap-3">
              <Input
                id="bestehtSeitWert"
                name="bestehtSeitWert"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                defaultValue={w("bestehtSeitWert")}
                aria-label="Dauer"
                aria-invalid={f("bestehtSeitWert") ? true : undefined}
                className="w-28"
              />
              <Select
                id="bestehtSeitEinheit"
                name="bestehtSeitEinheit"
                value={auswahl.bestehtSeitEinheit}
                onChange={waehle("bestehtSeitEinheit")}
                aria-label="Einheit"
                aria-invalid={f("bestehtSeitEinheit") ? true : undefined}
                className="w-40"
              >
                {ZEITEINHEITEN.map((z) => (
                  <option key={z.wert} value={z.wert}>
                    {z.label}
                  </option>
                ))}
              </Select>
            </div>
            {(f("bestehtSeitWert") || f("bestehtSeitEinheit")) && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {f("bestehtSeitWert") ?? f("bestehtSeitEinheit")}
              </p>
            )}
          </fieldset>

          <div className="space-y-3">
            <label className="tippziel flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="rezidiv"
                checked={rezidiv}
                onChange={(e) => setRezidiv(e.target.checked)}
                className="size-5 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-sm font-medium">Rezidiv</span>
            </label>

            {/* Erst zeigen, wenn es etwas zu zaehlen gibt. */}
            {rezidiv && (
              <Field
                id="rezidivAnzahl"
                label="Anzahl der Rezidive"
                fehler={f("rezidivAnzahl")}
                className="max-w-40"
              >
                {(p) => (
                  <Input
                    {...p}
                    name="rezidivAnzahl"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    defaultValue={w("rezidivAnzahl")}
                  />
                )}
              </Field>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" laedt={laeuft}>
          {absendeText}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={abbrechenNach}>Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
