import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Pencil,
  Plus,
  Stethoscope,
} from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { alterJahre } from "@/lib/schema/patient";
import { beschreibeLokalisation, beschreibeDauer } from "@/lib/wundtext";
import { DIAGNOSE_TYPEN, labelVon } from "@/lib/enums";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.patient.findUnique({ where: { id } });
  return { title: p ? `${p.nachname}, ${p.vorname}` : "Patient" };
}

export default async function PatientSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      wunden: {
        where: { geloeschtAm: null },
        orderBy: [{ abgeschlossenAm: "asc" }, { createdAt: "desc" }],
        include: {
          _count: { select: { aufnahmen: { where: { geloeschtAm: null } } } },
          aufnahmen: {
            where: { geloeschtAm: null },
            orderBy: { datum: "desc" },
            take: 1,
            select: { datum: true },
          },
        },
      },
    },
  });

  if (!patient || patient.geloeschtAm) notFound();

  const offene = patient.wunden.filter((w) => !w.abgeschlossenAm);
  const abgeschlossene = patient.wunden.filter((w) => w.abgeschlossenAm);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Patienten
        </Link>
      </div>

      {/* Kopfzeile: alles, was beim Verbandwechsel griffbereit sein muss */}
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {patient.nachname}, {patient.vorname}
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>Nr.</dt>
                <dd className="tabular font-medium text-foreground">
                  {patient.patientennummer}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Geboren</dt>
                <dd className="tabular font-medium text-foreground">
                  {patient.geburtsdatum.toLocaleDateString("de-DE")} (
                  {alterJahre(patient.geburtsdatum)} Jahre)
                </dd>
              </div>
              {patient.arztTherapieverantwortlich && (
                <div className="flex gap-1.5">
                  <dt>Arzt</dt>
                  <dd className="font-medium text-foreground">
                    {patient.arztTherapieverantwortlich}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <Button variant="outline" asChild>
            <Link href={`/patienten/${id}/bearbeiten`}>
              <Pencil aria-hidden="true" />
              Bearbeiten
            </Link>
          </Button>
        </CardContent>
      </Card>

      {patient.notizen && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-sm font-medium text-muted-foreground">Notizen</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{patient.notizen}</p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Wunden</h2>
          <Button asChild>
            <Link href={`/patienten/${id}/wunden/neu`}>
              <Plus aria-hidden="true" />
              Wunde anlegen
            </Link>
          </Button>
        </div>

        {patient.wunden.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Stethoscope className="size-10 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">Noch keine Wunde dokumentiert</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Lege eine Wunde an, um die Erstaufnahme zu erfassen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="space-y-3">
              {offene.map((w) => (
                <WundeKarte key={w.id} wunde={w} />
              ))}
            </ul>

            {abgeschlossene.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ChevronRight
                      className="size-4 transition-transform duration-200 group-open:rotate-90"
                      aria-hidden="true"
                    />
                    {abgeschlossene.length === 1
                      ? "1 abgeschlossene Wunde"
                      : `${abgeschlossene.length} abgeschlossene Wunden`}
                  </span>
                </summary>
                <ul className="mt-3 space-y-3">
                  {abgeschlossene.map((w) => (
                    <WundeKarte key={w.id} wunde={w} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}

type WundeMitZahlen = {
  id: string;
  bezeichnung: string;
  diagnoseTyp: string;
  lokalisationRegion: string | null;
  lokalisationSeite: string | null;
  lokalisationAusrichtung: string | null;
  lokalisationFreitext: string | null;
  bestehtSeitWert: number | null;
  bestehtSeitEinheit: string | null;
  abgeschlossenAm: Date | null;
  _count: { aufnahmen: number };
  aufnahmen: { datum: Date }[];
};

function WundeKarte({ wunde }: { wunde: WundeMitZahlen }) {
  const lokalisation = beschreibeLokalisation(wunde);
  const dauer = beschreibeDauer(wunde);
  const letzte = wunde.aufnahmen[0]?.datum;

  return (
    <li>
      <Link href={`/wunden/${wunde.id}`} className="block rounded-xl">
        <Card className="hover:border-primary">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{wunde.bezeichnung}</p>
                {wunde.abgeschlossenAm && (
                  // Status nie nur ueber Farbe - Icon und Text gehoeren dazu.
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    <CircleCheck className="size-3.5" aria-hidden="true" />
                    Abgeschlossen
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {labelVon(DIAGNOSE_TYPEN, wunde.diagnoseTyp)}
                {lokalisation && ` · ${lokalisation}`}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="tabular">
                  {wunde._count.aufnahmen === 1
                    ? "1 Aufnahme"
                    : `${wunde._count.aufnahmen} Aufnahmen`}
                </span>
                {letzte && (
                  <span className="tabular inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    zuletzt {letzte.toLocaleDateString("de-DE")}
                  </span>
                )}
                {dauer && <span>besteht seit {dauer}</span>}
              </p>
            </div>
            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
