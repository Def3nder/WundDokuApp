"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { useTheme } from "next-themes";
import {
  diagrammDatumLang,
  type Verlaufspunkt,
} from "@/lib/auswertung";
import { cn } from "@/lib/utils";
import { formatiereMm2 } from "@/lib/wundmasse";

const deutscheZahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const terminDatumFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

function terminDatum(wert: string): string {
  const datum = new Date(wert);
  return Number.isNaN(datum.getTime()) ? "Datum unbekannt" : terminDatumFormatter.format(datum);
}

function terminPosition(index: number, anzahl: number): string {
  // Gleiche Terminabstaende; begrenzte Praezision vermeidet CSS-Hydrationsfehler.
  return `${Math.round((index / Math.max(1, anzahl - 1)) * 100_000) / 1000}%`;
}

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
  const panelId = useId();

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
  const ausgewaehltIndex = daten.findIndex((punkt) => punkt.id === ausgewaehlt.id);
  const sliderId = `${panelId}-zeitstrahl`;

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

      <div
        role="group"
        aria-labelledby={`${panelId}-auswahl`}
        className="mt-5 min-w-0 border-t border-border pt-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label id={`${panelId}-auswahl`} htmlFor={sliderId} className="text-sm font-medium text-heading">
            Aufnahme auswählen
          </label>
          <span className="tabular text-xs text-muted-foreground">
            {ausgewaehltIndex + 1} von {daten.length}
          </span>
        </div>
        <p className="mt-3 text-center text-base font-semibold tabular text-primary">
          <span className="sr-only">Ausgewählt: </span>
          <time data-ausgewaehlter-termin dateTime={ausgewaehlt.datum}>{terminDatum(ausgewaehlt.datum)}</time>
        </p>
        <div className="relative mt-1">
          {/* Die Endpunkte liegen in der Mitte des 28-px-Reglers. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-3.5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-strong">
            <div className="h-full rounded-full bg-primary" style={{ width: terminPosition(ausgewaehltIndex, daten.length) }} />
            {daten.map((punkt, index) => (
              <span
                key={punkt.id}
                data-termin-markierung
                className={cn(
                  "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  index <= ausgewaehltIndex ? "bg-primary" : "bg-border-strong",
                )}
                style={{ left: terminPosition(index, daten.length) }}
              />
            ))}
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={daten.length}
            step={1}
            value={ausgewaehltIndex + 1}
            disabled={daten.length === 1}
            onChange={(event) => {
              const punkt = daten[Number(event.currentTarget.value) - 1];
              if (punkt) setAusgewaehltId(punkt.id);
            }}
            aria-controls={panelId}
            aria-valuetext={`${datumLang}, Aufnahme ${ausgewaehltIndex + 1} von ${daten.length}`}
            className="timeline-slider relative block h-12 w-full cursor-pointer appearance-none rounded-lg bg-transparent disabled:cursor-default"
          />
        </div>
        <div className="flex justify-between gap-4 text-xs tabular text-muted-foreground">
          <span>
            <span className="block">Erste Aufnahme</span>
            <time dateTime={daten[0].datum}>{terminDatum(daten[0].datum)}</time>
          </span>
          <span className="text-right">
            <span className="block">Letzte Aufnahme</span>
            <time dateTime={daten.at(-1)!.datum}>{terminDatum(daten.at(-1)!.datum)}</time>
          </span>
        </div>
      </div>
    </div>
  );
}
