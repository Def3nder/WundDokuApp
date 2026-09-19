"use client";

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
import { Activity, Droplets, Ruler, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WUNDGRUND_GRUPPEN } from "@/lib/enums";
import type { WundgrundGruppeId } from "@/lib/auswertung";
import { flaechenTrend, formatiereMm2, formatiereProzent } from "@/lib/wundmasse";

export type Verlaufspunkt = {
  id: string;
  datum: string;
  flaeche: number | null;
  breiteMm: number | null;
  laengeMm: number | null;
  tiefeMm: number | null;
  schmerzVas: number | null;
  exsudatStufe: number | null;
  exsudatLabel: string;
  wundgrund: Record<WundgrundGruppeId, number>;
};

const deutscheZahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const gruppenFarben = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
];

function datumKurz(wert: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(
    new Date(wert),
  );
}

function datumLang(wert: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(wert));
}

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
        tickFormatter={datumKurz}
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
    <Card className={breit ? "lg:col-span-2" : undefined}>
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
  const flaechen = daten.filter((punkt) => punkt.flaeche != null);
  const erster = flaechen.at(0)?.flaeche ?? null;
  const letzter = flaechen.at(-1)?.flaeche ?? null;
  const gesamttrend = flaechenTrend(letzter, erster);
  const letzterPunkt = daten.at(-1);
  const chartDaten = daten.map((punkt) => ({ ...punkt, ...punkt.wundgrund }));
  const hatMasse = daten.some(
    (punkt) => punkt.breiteMm != null || punkt.laengeMm != null || punkt.tiefeMm != null,
  );
  const hatBelastung = daten.some(
    (punkt) => punkt.schmerzVas != null || punkt.exsudatStufe != null,
  );
  const hatWundgrund = daten.some((punkt) =>
    Object.values(punkt.wundgrund).some((anzahl) => anzahl > 0),
  );

  return (
    <div className="space-y-4">
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-3">
        <div className="p-5 sm:border-r sm:border-border">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Aktuelle Fläche
          </p>
          <p className="messwert mt-2 text-2xl font-semibold text-heading">
            {formatiereMm2(letzter)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {letzterPunkt ? `Stand ${datumLang(letzterPunkt.datum)}` : "Keine Messung"}
          </p>
        </div>
        <div className="border-t border-border p-5 sm:border-r sm:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Seit erster Messung
          </p>
          <p
            className={`messwert mt-2 text-2xl font-semibold ${
              gesamttrend?.richtung === "verkleinert"
                ? "text-status-gut"
                : gesamttrend?.richtung === "vergroessert"
                  ? "text-status-schlecht"
                  : "text-foreground"
            }`}
          >
            {gesamttrend ? formatiereProzent(gesamttrend.prozent) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {gesamttrend ? formatiereMm2(gesamttrend.differenz) : "Noch kein Vergleich möglich"}
          </p>
        </div>
        <div className="border-t border-border p-5 sm:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Dokumentierte Termine
          </p>
          <p className="messwert mt-2 text-2xl font-semibold text-heading">{daten.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Nur abgeschlossene Aufnahmen</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                    labelFormatter={(label) => datumLang(String(label))}
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
          beschreibung="Breite, Länge und Tiefe in Millimetern."
        >
          {hatMasse ? (
            <div className="h-72 w-full" role="img" aria-label="Verlauf der Wundabmessungen">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daten} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                  <Achsen />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    labelFormatter={(label) => datumLang(String(label))}
                    formatter={(wert, name) => [
                      `${deutscheZahl.format(Number(wert))} mm`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="breiteMm" name="Breite" stroke="var(--chart-1)" strokeWidth={2.5} connectNulls />
                  <Line type="monotone" dataKey="laengeMm" name="Länge" stroke="var(--chart-2)" strokeWidth={2.5} strokeDasharray="7 3" connectNulls />
                  <Line type="monotone" dataKey="tiefeMm" name="Tiefe" stroke="var(--chart-4)" strokeWidth={2.5} strokeDasharray="2 3" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <KeineMesswerte text="Für diesen Verlauf wurden noch keine Abmessungen dokumentiert." />
          )}
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
                  <XAxis dataKey="datum" tickFormatter={datumKurz} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border-strong)" }} minTickGap={18} />
                  <YAxis yAxisId="vas" domain={[0, 10]} width={30} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="exsudat" orientation="right" domain={[0, 3]} ticks={[0, 1, 2, 3]} width={24} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    labelFormatter={(label) => datumLang(String(label))}
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
          breit
        >
          {hatWundgrund ? (
            <div className="h-72 w-full" role="img" aria-label="Verlauf der Wundgrund-Zusammensetzung">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDaten} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                  <Achsen />
                  <Tooltip
                    contentStyle={tooltipStil()}
                    labelFormatter={(label) => datumLang(String(label))}
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
      </div>

      <table className="nur-screenreader">
        <caption>Tabellarische Daten der Verlaufsdiagramme</caption>
        <thead>
          <tr>
            <th>Datum</th><th>Fläche</th><th>Breite</th><th>Länge</th><th>Tiefe</th><th>Schmerz-VAS</th><th>Exsudat</th>
          </tr>
        </thead>
        <tbody>
          {daten.map((punkt) => (
            <tr key={punkt.id}>
              <td>{datumLang(punkt.datum)}</td><td>{punkt.flaeche ?? "–"}</td><td>{punkt.breiteMm ?? "–"}</td><td>{punkt.laengeMm ?? "–"}</td><td>{punkt.tiefeMm ?? "–"}</td><td>{punkt.schmerzVas ?? "–"}</td><td>{punkt.exsudatLabel || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
