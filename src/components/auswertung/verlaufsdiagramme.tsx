"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChartLine, ChevronDown, Droplets, Ruler, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AbmessungenVerlauf } from "@/components/auswertung/abmessungen-verlauf";
import { KennzahlKachel } from "@/components/auswertung/kennzahl-kachel";
import { TerminUebersicht } from "@/components/auswertung/termin-uebersicht";
import { useIstDunkel } from "@/components/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WUNDGRUND_GRUPPEN } from "@/lib/enums";
import {
  diagrammAchsenDatum,
  diagrammDatumKurz,
  diagrammDatumLang,
  diagrammTooltipDatum,
  type Verlaufspunkt,
} from "@/lib/auswertung";
import { flaechenTrend, formatiereMm2, formatiereProzent } from "@/lib/wundmasse";

export type { Verlaufspunkt };

const deutscheZahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const gruppenFarben = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
];

function tooltipStil() {
  return {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border-strong)",
    borderRadius: "0.625rem",
    boxShadow: "0 10px 24px rgb(15 23 42 / 0.12)",
    color: "var(--foreground)",
    fontSize: "0.875rem",
  };
}

function Achsen({ einheit }: { einheit?: string }) {
  return (
    <>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
      <XAxis
        dataKey="datum"
        interval={0}
        tickFormatter={diagrammDatumKurz}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        tickLine={false}
        axisLine={{ stroke: "var(--border-strong)" }}
        minTickGap={18}
      />
      <YAxis
        width={einheit ? 58 : 38}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(wert) => `${deutscheZahl.format(Number(wert))}${einheit ?? ""}`}
      />
    </>
  );
}

function DiagrammKarte({
  icon: Icon,
  titel,
  beschreibung,
  children,
  breit = false,
}: {
  icon: typeof Activity;
  titel: string;
  beschreibung: string;
  children: React.ReactNode;
  breit?: boolean;
}) {
  return (
    <Card className={cn("min-w-0", breit && "lg:col-span-2")}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-on-secondary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>{titel}</CardTitle>
            <CardDescription>{beschreibung}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KeineMesswerte({ text }: { text: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/50 px-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function Verlaufsdiagramme({ daten }: { daten: Verlaufspunkt[] }) {
  const [offen, setOffen] = useState(false);
  const inhaltId = useId();
  // Feste rgba()-Werte statt einer CSS-Variable: iOS Safari zeigte im SVG-
  // `fill`-Attribut die falsche Farbe (vermutlich `var()` oder die moderne
  // rgb()-Syntax mit Schraegstrich-Alpha wird dort im SVG-Kontext nicht
  // zuverlaessig aufgeloest) - auf dem Desktop war das Ergebnis korrekt.
  // `useIstDunkel` umgeht das, indem die Farbe direkt in JS statt im SVG per
  // CSS-Variable bestimmt wird - und zwar erst nach der Hydration, sonst
  // weichen Server- und Client-Markup voneinander ab (theme-provider.tsx).
  const balkenHervorhebung = useIstDunkel()
    ? "rgba(2, 6, 23, 0.55)"
    : "rgba(15, 23, 42, 0.06)";
  const flaechen = daten.filter((punkt) => punkt.flaeche != null);
  const erster = flaechen.at(0)?.flaeche ?? null;
  const letzter = flaechen.at(-1)?.flaeche ?? null;
  const gesamttrend = flaechenTrend(letzter, erster);
  const letzterPunkt = daten.at(-1);
  // Nur fuer die kleine Wundflaechen-Vorschau: echter Zeitstempel je Punkt
  // fuer eine zeitproportionale Achse (siehe dort).
  const zeitDaten = daten.map((punkt) => ({ ...punkt, t: new Date(punkt.datum).getTime() }));
  const chartDaten = daten.map((punkt) => ({ ...punkt, ...punkt.wundgrund }));
  const hatBelastung = daten.some(
    (punkt) => punkt.schmerzVas != null || punkt.exsudatStufe != null,
  );
  const hatWundgrund = daten.some((punkt) =>
    Object.values(punkt.wundgrund).some((anzahl) => anzahl > 0),
  );

  return (
    <div className="space-y-4">
      <div className="grid rounded-xl border border-border bg-card shadow-sm sm:grid-cols-3">
        <KennzahlKachel
          className="sm:border-r sm:border-border"
          titel="Aktuelle Fläche"
          wert={formatiereMm2(letzter)}
          wertKlasse="text-heading"
          hinweis={letzterPunkt ? `Stand ${diagrammDatumLang(letzterPunkt.datum)}` : "Keine Messung"}
          vorschauTitel="Wundfläche"
          maxBreite={560}
          dekorativ
          inhalt={
            flaechen.length
              ? (breite) => (
                  /* Feste Pixelgroesse statt ResponsiveContainer: In diesem per
                     Hover/Touch frisch eingeblendeten, absolut positionierten
                     Popover misst ResponsiveContainer auf iOS Safari beim ersten
                     Rendern zuverlaessig eine Breite/Hoehe von 0 - der Vorschau-
                     Inhalt blieb dort leer. Anders als die vier Diagramme im
                     Wundverlauf unten nutzt nur diese kleine Vorschau eine echte,
                     zeitproportionale Achse (`t` in Millisekunden statt der
                     kategorialen `datum`-Achse) - unterschiedliche Abstaende
                     zwischen Aufnahmen sind hier also auch als unterschiedlich
                     breite Abschnitte sichtbar. */
                  <AreaChart
                    width={breite}
                    height={280}
                    data={zeitDaten}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={diagrammAchsenDatum}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border-strong)" }}
                      minTickGap={32}
                    />
                    <Area
                      type="monotone"
                      dataKey="flaeche"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="var(--chart-1)"
                      fillOpacity={0.22}
                      connectNulls
                    />
                  </AreaChart>
                )
              : undefined
          }
        />
        <KennzahlKachel
          className="border-t border-border sm:border-r sm:border-t-0"
          titel="Seit erster Messung"
          wert={gesamttrend ? formatiereProzent(gesamttrend.prozent) : "–"}
          wertKlasse={
            gesamttrend?.richtung === "verkleinert"
              ? "text-status-gut"
              : gesamttrend?.richtung === "vergroessert"
                ? "text-status-schlecht"
                : "text-foreground"
          }
          hinweis={
            gesamttrend ? formatiereMm2(gesamttrend.differenz) : "Noch kein Vergleich möglich"
          }
          vorschauTitel="Abmessungen"
          maxBreite={640}
          inhalt={daten.length ? () => <AbmessungenVerlauf daten={daten} /> : undefined}
        />
        <KennzahlKachel
          className="border-t border-border sm:border-t-0"
          titel="Dokumentierte Termine"
          wert={daten.length}
          wertKlasse="text-heading"
          hinweis="Nur abgeschlossene Aufnahmen"
          vorschauTitel="Letzte Termine"
          maxBreite={380}
          inhalt={daten.length ? () => <TerminUebersicht daten={daten} /> : undefined}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls={inhaltId}
          className="flex w-full items-center gap-3 p-4 text-left cursor-pointer sm:p-5"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-on-secondary"
          >
            <ChartLine className="size-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-base font-semibold text-heading">
              Wundverlauf
            </span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
              Fläche, Abmessungen, Schmerz/Exsudat und Wundgrund als Diagramme
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              offen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        <div
          id={inhaltId}
          hidden={!offen}
          className="grid gap-4 border-t border-border p-4 lg:grid-cols-2 sm:p-5"
        >
        <DiagrammKarte
          icon={Activity}
          titel="Wundfläche"
          beschreibung="Breite × Länge in mm² – kleinere Werte bedeuten Heilungsfortschritt."
          breit
        >
          {flaechen.length ? (
            <div className="h-72 w-full" role="img" aria-label="Verlauf der Wundfläche">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daten} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="flaechenFuellung" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <Achsen />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    labelFormatter={diagrammTooltipDatum}
                    formatter={(wert) => [`${deutscheZahl.format(Number(wert))} mm²`, "Fläche"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="flaeche"
                    name="Fläche"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    fill="url(#flaechenFuellung)"
                    connectNulls
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <KeineMesswerte text="Für die Flächenkurve fehlen noch vollständige Breiten- und Längenmessungen." />
          )}
        </DiagrammKarte>

        <DiagrammKarte
          icon={Ruler}
          titel="Abmessungen"
          beschreibung="Ausgewählte Aufnahme als schematische Draufsicht und Tiefenprofil."
          breit
        >
          <AbmessungenVerlauf daten={daten} />
        </DiagrammKarte>

        <DiagrammKarte
          icon={Droplets}
          titel="Schmerz & Exsudation"
          beschreibung="VAS 0–10 und Exsudatstufe 0–3 auf getrennten Achsen."
        >
          {hatBelastung ? (
            <div className="h-72 w-full" role="img" aria-label="Verlauf von Schmerz und Exsudation">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daten} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="datum" interval={0} tickFormatter={diagrammDatumKurz} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border-strong)" }} minTickGap={18} />
                  <YAxis yAxisId="vas" domain={[0, 10]} width={30} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="exsudat" orientation="right" domain={[0, 3]} ticks={[0, 1, 2, 3]} width={24} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    labelFormatter={diagrammTooltipDatum}
                    formatter={(wert, name, eintrag) => [
                      name === "Exsudat" ? (eintrag.payload?.exsudatLabel || "–") : `${wert}/10`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }} />
                  <Line yAxisId="vas" type="monotone" dataKey="schmerzVas" name="Schmerz-VAS" stroke="var(--chart-5)" strokeWidth={2.5} connectNulls />
                  <Line yAxisId="exsudat" type="stepAfter" dataKey="exsudatStufe" name="Exsudat" stroke="var(--chart-3)" strokeWidth={2.5} strokeDasharray="6 3" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <KeineMesswerte text="Schmerz und Exsudat wurden bislang nicht als Verlaufswerte erfasst." />
          )}
        </DiagrammKarte>

        <DiagrammKarte
          icon={Sparkles}
          titel="Wundgrund-Zusammensetzung"
          beschreibung="Dokumentierte Befunde, gebündelt in fünf klinische Gruppen."
        >
          {hatWundgrund ? (
            <div className="h-72 w-full" role="img" aria-label="Verlauf der Wundgrund-Zusammensetzung">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDaten} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                  <Achsen />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    cursor={{ fill: balkenHervorhebung }}
                    labelFormatter={diagrammTooltipDatum}
                    formatter={(wert, name) => [
                      `${wert} ${Number(wert) === 1 ? "Befund" : "Befunde"}`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }} />
                  {WUNDGRUND_GRUPPEN.map((gruppe, index) => (
                    <Bar
                      key={gruppe.id}
                      dataKey={gruppe.id}
                      name={gruppe.label}
                      stackId="wundgrund"
                      fill={gruppenFarben[index]}
                      maxBarSize={44}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <KeineMesswerte text="Für die Wundgrund-Auswertung fehlen noch gruppierbare Befunde." />
          )}
        </DiagrammKarte>

        <div className="nur-screenreader">
          <table>
            <caption>Tabellarische Daten der Verlaufsdiagramme</caption>
            <thead>
              <tr>
                <th>Datum</th><th>Fläche</th><th>Breite</th><th>Länge</th><th>Tiefe</th><th>Schmerz-VAS</th><th>Exsudat</th>
              </tr>
            </thead>
            <tbody>
              {daten.map((punkt) => (
                <tr key={punkt.id}>
                  <td>{diagrammDatumLang(punkt.datum)}</td><td>{punkt.flaeche ?? "–"}</td><td>{punkt.breiteMm ?? "–"}</td><td>{punkt.laengeMm ?? "–"}</td><td>{punkt.tiefeMm ?? "–"}</td><td>{punkt.schmerzVas ?? "–"}</td><td>{punkt.exsudatLabel || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
