"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Ruler } from "lucide-react";
import { useTheme } from "next-themes";
import {
  diagrammDatumKurz,
  diagrammDatumLang,
  type Verlaufspunkt,
} from "@/lib/auswertung";
import { cn } from "@/lib/utils";
import { formatiereMm2 } from "@/lib/wundmasse";

const deutscheZahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

function mass(wert: number | null): string {
  return wert == null ? "–" : deutscheZahl.format(wert);
}

function massMitEinheit(wert: number | null): string {
  return wert == null ? "Nicht dokumentiert" : `${deutscheZahl.format(wert)} mm`;
}

function svgAusdehnung(wert: number | null, maximum: number): number {
  if (wert == null) return 0;
  return Math.max(10, (wert / maximum) * 140);
}

function draufsichtBeschreibung(punkt: Verlaufspunkt): string {
  if (punkt.laengeMm == null && punkt.breiteMm == null) {
    return "Keine Länge oder Breite dokumentiert";
  }
  if (punkt.laengeMm == null) {
    return `Nur Breite dokumentiert: ${massMitEinheit(punkt.breiteMm)}`;
  }
  if (punkt.breiteMm == null) {
    return `Nur Länge dokumentiert: ${massMitEinheit(punkt.laengeMm)}`;
  }
  return `Schematische Wunddraufsicht, Länge ${massMitEinheit(punkt.laengeMm)}, Breite ${massMitEinheit(punkt.breiteMm)}`;
}

export function AbmessungenVerlauf({ daten }: { daten: Verlaufspunkt[] }) {
  const { resolvedTheme } = useTheme();
  const istDunkel = resolvedTheme === "dark";
  // Direkte SVG-Farbwerte statt CSS-Variablen/currentColor: iOS Safari
  // stellte diese Farben auf einzelnen iPads sonst vollständig schwarz dar.
  const wundFarbe = istDunkel ? "#fda4af" : "#be123c";
  const tiefenFarbe = istDunkel ? "#c4b5fd" : "#7c3aed";
  const tiefenRandFarbe = istDunkel ? "#4c5c7a" : "#94a3b8";
  const tiefenTextFarbe = istDunkel ? "#7dd3fc" : "#164e63";
  const neuesteId = daten.at(-1)?.id ?? null;
  const [ausgewaehltId, setAusgewaehltId] = useState<string | null>(neuesteId);
  const leisteRef = useRef<HTMLDivElement>(null);
  const schalterRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const hatAusgerichtet = useRef(false);

  const ausgewaehlt =
    daten.find((punkt) => punkt.id === ausgewaehltId) ?? daten.at(-1) ?? null;

  const maxGrundmass = useMemo(
    () =>
      Math.max(
        1,
        ...daten.flatMap((punkt) =>
          [punkt.laengeMm, punkt.breiteMm].filter((wert): wert is number => wert != null),
        ),
      ),
    [daten],
  );
  const maxTiefe = useMemo(
    () =>
      Math.max(
        1,
        ...daten
          .map((punkt) => punkt.tiefeMm)
          .filter((wert): wert is number => wert != null),
      ),
    [daten],
  );

  useEffect(() => {
    if (ausgewaehltId && daten.some((punkt) => punkt.id === ausgewaehltId)) return;
    setAusgewaehltId(daten.at(-1)?.id ?? null);
  }, [ausgewaehltId, daten]);

  useEffect(() => {
    const leiste = leisteRef.current;
    if (!leiste) return;
    hatAusgerichtet.current = false;

    function rechtsAusgerichtetStarten() {
      if (!leiste || leiste.clientWidth === 0 || hatAusgerichtet.current) return;
      leiste.scrollLeft = leiste.scrollWidth - leiste.clientWidth;
      hatAusgerichtet.current = true;
    }

    rechtsAusgerichtetStarten();
    const beobachter = new ResizeObserver(rechtsAusgerichtetStarten);
    beobachter.observe(leiste);
    return () => beobachter.disconnect();
  }, [daten.length]);

  if (!ausgewaehlt) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/50 px-6 text-center text-sm text-muted-foreground">
        Noch keine abgeschlossene Aufnahme vorhanden.
      </div>
    );
  }

  const hatLaenge = ausgewaehlt.laengeMm != null;
  const hatBreite = ausgewaehlt.breiteMm != null;
  const hatGrundflaeche = hatLaenge && hatBreite;
  const laengenAusdehnung = svgAusdehnung(ausgewaehlt.laengeMm, maxGrundmass);
  const breitenAusdehnung = svgAusdehnung(ausgewaehlt.breiteMm, maxGrundmass);
  const zentrumX = 140;
  const zentrumY = 90;
  const links = zentrumX - laengenAusdehnung / 2;
  const rechts = zentrumX + laengenAusdehnung / 2;
  const oben = zentrumY - breitenAusdehnung / 2;
  const unten = zentrumY + breitenAusdehnung / 2;
  const konturPfad = hatGrundflaeche
    ? [
        `M ${zentrumX} ${oben}`,
        `C ${rechts - laengenAusdehnung * 0.18} ${oben - 4}, ${rechts + 4} ${zentrumY - breitenAusdehnung * 0.2}, ${rechts} ${zentrumY}`,
        `C ${rechts - 2} ${zentrumY + breitenAusdehnung * 0.28}, ${zentrumX + laengenAusdehnung * 0.22} ${unten + 4}, ${zentrumX} ${unten}`,
        `C ${zentrumX - laengenAusdehnung * 0.28} ${unten + 2}, ${links - 4} ${zentrumY + breitenAusdehnung * 0.16}, ${links} ${zentrumY}`,
        `C ${links + 2} ${zentrumY - breitenAusdehnung * 0.3}, ${zentrumX - laengenAusdehnung * 0.2} ${oben + 2}, ${zentrumX} ${oben}`,
        "Z",
      ].join(" ")
    : "";
  const tiefenAnteil = ausgewaehlt.tiefeMm == null ? null : ausgewaehlt.tiefeMm / maxTiefe;
  const profilOben = 40;
  const profilBoden = profilOben + Math.max(7, (tiefenAnteil ?? 0) * 72);
  const datumLang = diagrammDatumLang(ausgewaehlt.datum);

  function tastaturAuswahl(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let ziel: number | null = null;
    if (event.key === "ArrowLeft") ziel = Math.max(0, index - 1);
    if (event.key === "ArrowRight") ziel = Math.min(daten.length - 1, index + 1);
    if (event.key === "Home") ziel = 0;
    if (event.key === "End") ziel = daten.length - 1;
    if (ziel == null || ziel === index) return;

    event.preventDefault();
    setAusgewaehltId(daten[ziel].id);
    const schalter = schalterRefs.current[ziel];
    schalter?.focus();
    schalter?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div
      role="region"
      aria-label="Interaktive Darstellung der Wundabmessungen"
      className="min-w-0"
    >
      <p className="sr-only" aria-live="polite">
        Ausgewählte Aufnahme vom {datumLang}: Länge {massMitEinheit(ausgewaehlt.laengeMm)},
        Breite {massMitEinheit(ausgewaehlt.breiteMm)}, Tiefe {massMitEinheit(ausgewaehlt.tiefeMm)}.
      </p>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-base font-semibold text-heading">Aufnahme vom {datumLang}</p>
        <p className="text-xs text-muted-foreground">Schematische Darstellung im gemeinsamen Maßstab</p>
      </div>

      <dl className="mt-3 grid overflow-hidden rounded-lg border border-border bg-surface-muted/35 sm:grid-cols-3">
        <div className="p-4 sm:border-r sm:border-border">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Länge × Breite
          </dt>
          <dd className="messwert mt-1.5 text-xl font-semibold text-heading">
            {mass(ausgewaehlt.laengeMm)} × {mass(ausgewaehlt.breiteMm)} mm
          </dd>
        </div>
        <div className="border-t border-border p-4 sm:border-r sm:border-t-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Tiefe
          </dt>
          <dd className="messwert mt-1.5 text-xl font-semibold text-heading">
            {massMitEinheit(ausgewaehlt.tiefeMm)}
          </dd>
        </div>
        <div className="border-t border-border p-4 sm:border-t-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Fläche
          </dt>
          <dd className="messwert mt-1.5 text-xl font-semibold text-heading">
            {formatiereMm2(ausgewaehlt.flaeche)}
          </dd>
        </div>
      </dl>

      <div id={panelId} className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="min-w-0" aria-labelledby={`${panelId}-draufsicht`}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 id={`${panelId}-draufsicht`} className="font-heading text-sm font-semibold text-heading">
              Draufsicht
            </h3>
            <span className="text-xs text-muted-foreground">Länge und Breite</span>
          </div>
          <div
            role="img"
            aria-label={draufsichtBeschreibung(ausgewaehlt)}
            data-schema-gruppe
            className="flex h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted/30 p-3"
          >
            {!hatLaenge && !hatBreite ? (
              <div className="flex flex-col items-center justify-center gap-2 px-5 text-center text-sm text-muted-foreground">
                <Ruler className="size-7" aria-hidden="true" />
                Länge und Breite nicht dokumentiert
              </div>
            ) : (
              <div className="w-full max-w-60">
                <svg
                  viewBox="0 0 280 180"
                  aria-hidden="true"
                  className="block h-auto w-full rounded-lg"
                  style={{
                    backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  {hatGrundflaeche && (
                    <path
                      data-wundkontur
                      d={konturPfad}
                      fill={wundFarbe}
                      fillOpacity="0.15"
                      stroke={wundFarbe}
                      strokeWidth="2"
                    />
                  )}
                  {hatLaenge && (
                    <g stroke={wundFarbe} strokeWidth="1.5">
                      <line x1={links} y1={zentrumY} x2={rechts} y2={zentrumY} />
                      <line x1={links} y1={zentrumY - 6} x2={links} y2={zentrumY + 6} />
                      <line x1={rechts} y1={zentrumY - 6} x2={rechts} y2={zentrumY + 6} />
                    </g>
                  )}
                  {hatBreite && (
                    <g stroke={wundFarbe} strokeWidth="1.5">
                      <line x1={zentrumX} y1={oben} x2={zentrumX} y2={unten} />
                      <line x1={zentrumX - 6} y1={oben} x2={zentrumX + 6} y2={oben} />
                      <line x1={zentrumX - 6} y1={unten} x2={zentrumX + 6} y2={unten} />
                    </g>
                  )}
                </svg>
                <div className="mt-2 flex flex-wrap justify-center gap-2" aria-hidden="true">
                  {hatLaenge && (
                    <span className="rounded-md border border-border bg-card/95 px-2 py-1 text-xs tabular shadow-sm">
                      Länge {mass(ausgewaehlt.laengeMm)} mm
                    </span>
                  )}
                  {hatBreite && (
                    <span className="rounded-md border border-border bg-card/95 px-2 py-1 text-xs tabular shadow-sm">
                      Breite {mass(ausgewaehlt.breiteMm)} mm
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {hatLaenge !== hatBreite && (
            <p className="mt-2 text-xs text-muted-foreground">
              Keine geschlossene Kontur, weil {hatLaenge ? "die Breite" : "die Länge"} nicht dokumentiert ist.
            </p>
          )}
        </section>

        <section className="min-w-0" aria-labelledby={`${panelId}-tiefe`}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 id={`${panelId}-tiefe`} className="font-heading text-sm font-semibold text-heading">
              Tiefe
            </h3>
            <span className="text-xs text-muted-foreground">Schematisches Seitenprofil</span>
          </div>
          <div
            data-schema-gruppe
            className="flex h-56 items-center justify-center rounded-xl border border-border bg-surface-muted/30 p-3"
          >
            {ausgewaehlt.tiefeMm == null ? (
              <div className="flex flex-col items-center gap-2 px-5 text-center text-sm text-muted-foreground">
                <Ruler className="size-7" aria-hidden="true" />
                Tiefe nicht dokumentiert
              </div>
            ) : (
              <svg
                viewBox="0 0 320 150"
                role="img"
                aria-label={`Schematisches Seitenprofil, Tiefe ${massMitEinheit(ausgewaehlt.tiefeMm)}`}
                className="h-auto w-full max-w-sm"
              >
                <title>Tiefenprofil der ausgewählten Aufnahme</title>
                <path
                  data-tiefenrand
                  d={`M20 ${profilOben} H82 M238 ${profilOben} H300`}
                  fill="none"
                  stroke={tiefenRandFarbe}
                  strokeLinecap="round"
                  strokeWidth="7"
                />
                <path
                  data-tiefenprofil
                  d={`M82 ${profilOben} C105 ${profilOben} 108 ${profilBoden} 160 ${profilBoden} C212 ${profilBoden} 215 ${profilOben} 238 ${profilOben}`}
                  fill="none"
                  stroke={tiefenFarbe}
                  strokeLinecap="round"
                  strokeWidth="4"
                  className="transition-all duration-300 motion-reduce:transition-none"
                />
                <g stroke={tiefenFarbe} strokeWidth="2">
                  <line x1="160" y1={profilOben + 4} x2="160" y2={profilBoden - 2} />
                  <line x1="154" y1={profilOben + 4} x2="166" y2={profilOben + 4} />
                  <line x1="154" y1={profilBoden - 2} x2="166" y2={profilBoden - 2} />
                </g>
                <text
                  x="176"
                  y={(profilOben + 4 + profilBoden) / 2 + 4}
                  fill={tiefenTextFarbe}
                  className="text-[13px] font-semibold"
                >
                  {mass(ausgewaehlt.tiefeMm)} mm
                </text>
              </svg>
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p id={`${panelId}-auswahl`} className="text-sm font-medium text-heading">
            Aufnahme auswählen
          </p>
          {daten.length > 5 && (
            <p className="text-xs text-muted-foreground">Für ältere Aufnahmen nach links scrollen</p>
          )}
        </div>
        <div
          ref={leisteRef}
          role="group"
          aria-labelledby={`${panelId}-auswahl`}
          className="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2"
        >
          {daten.map((punkt, index) => {
            const aktiv = punkt.id === ausgewaehlt.id;
            return (
              <button
                key={punkt.id}
                ref={(element) => {
                  schalterRefs.current[index] = element;
                }}
                type="button"
                aria-pressed={aktiv}
                aria-controls={panelId}
                aria-label={`${diagrammDatumKurz(punkt.datum)}, Länge ${massMitEinheit(punkt.laengeMm)}, Breite ${massMitEinheit(punkt.breiteMm)}, Tiefe ${massMitEinheit(punkt.tiefeMm)}`}
                onClick={() => setAusgewaehltId(punkt.id)}
                onKeyDown={(event) => tastaturAuswahl(event, index)}
                style={{
                  flex: "0 0 calc((100% - 2rem) / 5)",
                  minWidth: "5rem",
                }}
                className={cn(
                  "min-h-11 rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 xl:min-h-16 xl:px-3 xl:text-left",
                  aktiv
                    ? "border-primary bg-secondary/70 text-heading"
                    : "border-border bg-card hover:border-primary/60 hover:bg-surface-muted",
                )}
              >
                <span className="block text-sm font-semibold">{diagrammDatumKurz(punkt.datum)}</span>
                <span
                  data-termin-abmessungen
                  className="mt-1 hidden whitespace-nowrap text-xs tabular text-muted-foreground xl:block"
                >
                  L {mass(punkt.laengeMm)} · B {mass(punkt.breiteMm)} · T {mass(punkt.tiefeMm)} mm
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
