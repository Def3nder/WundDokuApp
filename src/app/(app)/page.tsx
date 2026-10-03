import Link from "next/link";
import { ChevronRight, CircleCheck, Plus, Search, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientenSuche } from "./patienten-suche";
import { alterJahre } from "@/lib/schema/patient";
import { DIAGNOSE_TYPEN, labelVon } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata = { title: "Patienten" };

/** Jüngstes Abschlussdatum aller Wunden eines Patienten, 0 wenn keine abgeschlossen ist. */
function zuletztAbgeschlossen(patient: { wunden: { abgeschlossenAm: Date | null }[] }): number {
  return patient.wunden.reduce(
    (neuestes, wunde) => Math.max(neuestes, wunde.abgeschlossenAm?.getTime() ?? 0),
    0,
  );
}

export default async function PatientenSeite({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter = "alle" } = await searchParams;
  const suche = q.trim();

  const patienten = await db.patient.findMany({
    where: {
      geloeschtAm: null,
      ...(suche
        ? {
            OR: [
              { nachname: { contains: suche } },
              { vorname: { contains: suche } },
              { patientennummer: { contains: suche } },
            ],
          }
        : {}),
    },
    orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    include: {
      wunden: {
        where: { geloeschtAm: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          diagnoseTyp: true,
          abgeschlossenAm: true,
          _count: { select: { aufnahmen: { where: { geloeschtAm: null } } } },
        },
      },
    },
  });

  // Die Einteilung steht bewusst nur hier und nicht zusaetzlich als
  // Datenbankabfrage: Zwei Fassungen derselben Regel laufen irgendwann
  // auseinander. Der Filter entscheidet nur noch, welche Bereiche erscheinen.
  const inBehandlung = patienten.filter((p) => p.wunden.some((w) => !w.abgeschlossenAm));
  const ohneBehandlung = patienten
    .filter((p) => p.wunden.length > 0 && p.wunden.every((w) => w.abgeschlossenAm))
    // Zuletzt abgeschlossen nach oben: Wer gerade fertig geworden ist, ist am
    // ehesten noch von Interesse. Bei gleichem Datum bleibt es alphabetisch -
    // `sort` ist stabil und die Abfrage liefert bereits nach Namen sortiert.
    .sort((a, b) => zuletztAbgeschlossen(b) - zuletztAbgeschlossen(a));
  const neue = patienten.filter((p) => p.wunden.length === 0);

  const bereiche = [
    { wert: "offen", titel: "In Behandlung", liste: inBehandlung, abgeschlossen: false },
    { wert: "abgeschlossen", titel: "Keine Behandlungen", liste: ohneBehandlung, abgeschlossen: true },
    { wert: "neu", titel: "Neue Patienten", liste: neue, abgeschlossen: false },
  ].filter((bereich) => filter === "alle" || filter === bereich.wert);

  const sichtbar = bereiche.reduce((summe, bereich) => summe + bereich.liste.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Patienten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sichtbar === 1 ? "1 Patient" : `${sichtbar} Patienten`}
            {suche && " gefunden"}
          </p>
        </div>
        <Button asChild>
          <Link href="/patienten/neu">
            <Plus aria-hidden="true" />
            Patient anlegen
          </Link>
        </Button>
      </div>

      <PatientenSuche standardSuche={q} standardFilter={filter} />

      {patienten.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            {suche ? (
              <>
                <Search className="size-10 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">Keine Treffer für „{suche}“</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Gesucht wird in Nachname, Vorname und Patientennummer.
                </p>
                <Button variant="outline" asChild className="mt-2">
                  <Link href="/">Suche zurücksetzen</Link>
                </Button>
              </>
            ) : (
              <>
                <Users className="size-10 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">Noch keine Patienten angelegt</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Lege einen Patienten an, um die erste Wunde zu dokumentieren.
                </p>
                <Button asChild className="mt-2">
                  <Link href="/patienten/neu">
                    <UserPlus aria-hidden="true" />
                    Ersten Patienten anlegen
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : sichtbar === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Keine Patienten in dieser Ansicht</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {suche
                ? `„${suche}“ trifft Patienten, aber keinen in diesem Bereich.`
                : "In diesem Bereich steht derzeit niemand."}
            </p>
            <Button variant="outline" asChild className="mt-2">
              <Link href={suche ? `/?q=${encodeURIComponent(suche)}` : "/"}>
                Alle Patienten zeigen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        bereiche
          .filter((bereich) => bereich.liste.length > 0)
          .map((bereich, index) => (
            <section
              key={bereich.wert}
              // Trennlinie und zusaetzlicher Abstand ab dem zweiten sichtbaren
              // Bereich - so setzt sich "Keine Behandlungen" deutlich ab.
              className={cn("space-y-4", index > 0 && "border-t border-border pt-8")}
            >
              <h2 className="text-lg font-semibold">
                {bereich.titel}{" "}
                <span className="tabular font-normal text-muted-foreground">
                  ({bereich.liste.length})
                </span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {bereich.liste.map((p) => (
                  <PatientKarte key={p.id} patient={p} abgeschlossen={bereich.abgeschlossen} />
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}

/** Nur die Felder, die die Karte wirklich braucht - wie `WundeMitZahlen` auf der Patientenseite. */
type PatientMitWunden = {
  id: string;
  nachname: string;
  vorname: string;
  patientennummer: string;
  geburtsdatum: Date;
  wunden: { diagnoseTyp: string; abgeschlossenAm: Date | null }[];
};

function PatientKarte({
  patient,
  abgeschlossen,
}: {
  patient: PatientMitWunden;
  abgeschlossen: boolean;
}) {
  const offene = patient.wunden.filter((w) => !w.abgeschlossenAm);

  return (
    <li>
      <Link
        href={`/patienten/${patient.id}`}
        className="block rounded-xl transition-colors duration-200"
      >
        <Card className="h-full hover:border-primary">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">
                  {patient.nachname}, {patient.vorname}
                </p>
                {abgeschlossen && (
                  // Status nie nur ueber Farbe - Icon und Text gehoeren dazu.
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    <CircleCheck className="size-3.5" aria-hidden="true" />
                    Keine Behandlungen
                  </span>
                )}
              </div>
              <p className="tabular text-sm text-muted-foreground">
                {patient.patientennummer} · {alterJahre(patient.geburtsdatum)} Jahre
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {offene.length === 0 ? (
                  patient.wunden.length === 0
                    ? "Keine Wunde dokumentiert"
                    : "Alle Wunden abgeschlossen"
                ) : (
                  <>
                    {offene.length === 1 ? "1 offene Wunde" : `${offene.length} offene Wunden`}
                    {" · "}
                    {offene
                      .slice(0, 2)
                      .map((w) => labelVon(DIAGNOSE_TYPEN, w.diagnoseTyp))
                      .join(", ")}
                  </>
                )}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
