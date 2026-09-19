import { CircleCheck, MapPin, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DIAGNOSE_TYPEN, labelVon } from "@/lib/enums";
import {
  beschreibeDauer,
  beschreibeLokalisation,
  beschreibeRezidiv,
} from "@/lib/wundtext";

type Wunde = {
  bezeichnung: string;
  diagnoseTyp: string;
  diagnoseFreitext: string | null;
  lokalisationRegion: string | null;
  lokalisationSeite: string | null;
  lokalisationAusrichtung: string | null;
  lokalisationFreitext: string | null;
  bestehtSeitWert: number | null;
  bestehtSeitEinheit: string | null;
  rezidiv: boolean;
  rezidivAnzahl: number | null;
  abgeschlossenAm: Date | null;
};

/**
 * Kopfzeile des Wund-Cockpits.
 *
 * Zeigt alles, was beim Verbandwechsel ohne Scrollen sichtbar sein muss:
 * Was fuer eine Wunde, wo, wie lange schon.
 */
export function WundeKopf({
  wunde,
  anzahlAufnahmen,
}: {
  wunde: Wunde;
  anzahlAufnahmen: number;
}) {
  const lokalisation = beschreibeLokalisation(wunde);
  const dauer = beschreibeDauer(wunde);
  const rezidiv = beschreibeRezidiv(wunde);

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{wunde.bezeichnung}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {labelVon(DIAGNOSE_TYPEN, wunde.diagnoseTyp)}
            </p>
          </div>

          {wunde.abgeschlossenAm && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
              <CircleCheck className="size-4" aria-hidden="true" />
              Abgeschlossen am {wunde.abgeschlossenAm.toLocaleDateString("de-DE")}
            </span>
          )}
        </div>

        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {lokalisation && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lokalisation
              </dt>
              <dd className="mt-0.5 flex items-start gap-1.5 text-sm font-medium">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {lokalisation}
              </dd>
            </div>
          )}

          {dauer && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Besteht seit
              </dt>
              <dd className="tabular mt-0.5 text-sm font-medium">{dauer}</dd>
            </div>
          )}

          {rezidiv && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rezidiv
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                <RotateCcw className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {rezidiv}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aufnahmen
            </dt>
            <dd className="tabular mt-0.5 text-sm font-medium">{anzahlAufnahmen}</dd>
          </div>
        </dl>

        {wunde.diagnoseFreitext && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {wunde.diagnoseFreitext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
