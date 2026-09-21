import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TrendBadge } from "@/components/wunde/trend-badge";
import { diagrammDatumZahl, type Verlaufspunkt } from "@/lib/auswertung";
import { flaechenTrend, formatiereMm2 } from "@/lib/wundmasse";

const MAX_TERMINE = 5;

/**
 * Kurzliste der juengsten Aufnahmen als Sprungziele.
 *
 * `daten` kommt aufsteigend (aelteste zuerst) - der Trend vergleicht deshalb
 * mit dem Vorgaenger im Ausgangsfeld, nicht mit dem Nachbarn in der hier
 * umgedrehten Anzeige.
 */
export function TerminUebersicht({ daten }: { daten: Verlaufspunkt[] }) {
  const start = Math.max(0, daten.length - MAX_TERMINE);
  const termine = daten
    .slice(start)
    .map((punkt, index) => ({
      punkt,
      trend: flaechenTrend(punkt.flaeche, daten[start + index - 1]?.flaeche ?? null),
    }))
    .reverse();

  return (
    <>
      <ul className="space-y-1">
        {termine.map(({ punkt, trend }) => (
          <li key={punkt.id}>
            <Link
              href={`/aufnahmen/${punkt.id}`}
              className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-surface-muted/60"
            >
              <time dateTime={punkt.datum} className="tabular text-sm font-medium text-heading">
                {diagrammDatumZahl(punkt.datum)}
              </time>
              <span className="tabular ml-auto text-sm text-muted-foreground">
                {formatiereMm2(punkt.flaeche)}
              </span>
              {trend && <TrendBadge trend={trend} />}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {daten.length > MAX_TERMINE && (
        <p className="mt-2 px-2 text-xs text-muted-foreground">
          {MAX_TERMINE} von {daten.length} Terminen
        </p>
      )}
    </>
  );
}
