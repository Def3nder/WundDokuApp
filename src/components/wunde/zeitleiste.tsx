import Link from "next/link";
import { Camera, FileText, ShieldAlert, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendBadge } from "./trend-badge";
import { flaechenTrend, formatiereMm2 } from "@/lib/wundmasse";
import { datum, relativesDatum } from "@/lib/wundtext";
import {
  AUFNAHME_TYPEN,
  EXSUDAT_MENGEN,
  LOKALE_INFEKTZEICHEN,
  WUNDGRUND,
  labelVon,
  labelsVon,
} from "@/lib/enums";

export type ZeitleistenEintrag = {
  id: string;
  typ: string;
  datum: Date;
  istEntwurf: boolean;
  breiteMm: number | null;
  laengeMm: number | null;
  tiefeMm: number | null;
  flaeche: number | null;
  exsudatMenge: string | null;
  schmerzen: boolean;
  schmerzVas: number | null;
  wundgrund: string[];
  infektzeichen: string[];
  systemischeZeichen: boolean;
  anzahlFotos: number;
  handzeichen: string | null;
};

/**
 * Senkrechte Zeitleiste aller Aufnahmen, neueste zuerst.
 *
 * Die Eintraege kommen absteigend an; fuer den Flaechentrend wird jeweils mit
 * dem naechsten Element verglichen - das ist die zeitlich vorherige Aufnahme.
 */
export function Zeitleiste({ eintraege }: { eintraege: ZeitleistenEintrag[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-border">
      {eintraege.map((e, i) => {
        const vorherige = eintraege[i + 1];
        const trend = flaechenTrend(e.flaeche, vorherige?.flaeche ?? null);
        const infiziert = e.infektzeichen.includes("WUNDINFEKTION") || e.systemischeZeichen;

        return (
          <li key={e.id} className="relative pl-10">
            <span
              aria-hidden="true"
              className="absolute left-0 top-5 flex size-8 items-center justify-center rounded-full border-2 border-border bg-surface"
            >
              <FileText className="size-4 text-muted-foreground" />
            </span>

            <Link href={`/aufnahmen/${e.id}`} className="block rounded-xl">
              <Card className="hover:border-primary">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="tabular font-medium">{datum(e.datum)}</span>
                    <span className="text-sm text-muted-foreground">
                      {relativesDatum(e.datum)}
                    </span>

                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {labelVon(AUFNAHME_TYPEN, e.typ)}
                    </span>

                    {e.istEntwurf && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        Entwurf
                      </span>
                    )}

                    {infiziert && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-schlecht/15 px-2 py-0.5 text-xs font-medium text-status-schlecht">
                        <ShieldAlert className="size-3.5" aria-hidden="true" />
                        {e.systemischeZeichen ? "Systemische Infektion" : "Wundinfektion"}
                      </span>
                    )}

                    {trend && <TrendBadge trend={trend} />}
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex min-w-0 flex-wrap gap-x-1.5">
                      <dt className="text-muted-foreground">Fläche</dt>
                      <dd className="tabular font-medium">{formatiereMm2(e.flaeche)}</dd>
                    </div>

                    {e.breiteMm != null && e.laengeMm != null && (
                  <div className="flex min-w-0 flex-wrap gap-x-1.5">
                        <dt className="text-muted-foreground">Maße</dt>
                        <dd className="tabular font-medium">
                          {e.breiteMm} × {e.laengeMm}
                          {e.tiefeMm != null && ` × ${e.tiefeMm}`} mm
                        </dd>
                      </div>
                    )}

                    {e.exsudatMenge && (
                  <div className="flex min-w-0 flex-wrap gap-x-1.5">
                        <dt className="text-muted-foreground">Exsudat</dt>
                        <dd className="font-medium">
                          {labelVon(EXSUDAT_MENGEN, e.exsudatMenge)}
                        </dd>
                      </div>
                    )}

                    {e.schmerzen && e.schmerzVas != null && (
                  <div className="flex min-w-0 flex-wrap gap-x-1.5">
                        <dt className="text-muted-foreground">Schmerz</dt>
                        <dd className="tabular font-medium">VAS {e.schmerzVas}/10</dd>
                      </div>
                    )}
                  </dl>

                  {e.wundgrund.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {labelsVon(WUNDGRUND, e.wundgrund).join(" · ")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {e.anzahlFotos > 0 && (
                      <span className="tabular inline-flex items-center gap-1">
                        <Camera className="size-3.5" aria-hidden="true" />
                        {e.anzahlFotos === 1 ? "1 Foto" : `${e.anzahlFotos} Fotos`}
                      </span>
                    )}
                    {e.handzeichen && <span>Handzeichen {e.handzeichen}</span>}
                    {e.infektzeichen.length > 0 && !infiziert && (
                      <span>{labelsVon(LOKALE_INFEKTZEICHEN, e.infektzeichen).join(", ")}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
