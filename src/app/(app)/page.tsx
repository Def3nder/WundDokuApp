import Link from "next/link";
import { ChevronRight, Plus, Search, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientenSuche } from "./patienten-suche";
import { alterJahre } from "@/lib/schema/patient";
import { DIAGNOSE_TYPEN, labelVon } from "@/lib/enums";

export const metadata = { title: "Patienten" };

export default async function PatientenSeite({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter = "alle" } = await searchParams;
  const suche = q.trim();
  const nurOffene = filter === "offen";

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
      ...(nurOffene
        ? { wunden: { some: { geloeschtAm: null, abgeschlossenAm: null } } }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Patienten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patienten.length === 1 ? "1 Patient" : `${patienten.length} Patienten`}
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
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {patienten.map((p) => {
            const offene = p.wunden.filter((w) => !w.abgeschlossenAm);
            return (
              <li key={p.id}>
                <Link
                  href={`/patienten/${p.id}`}
                  className="block rounded-xl transition-colors duration-200"
                >
                  <Card className="h-full hover:border-primary">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {p.nachname}, {p.vorname}
                        </p>
                        <p className="tabular text-sm text-muted-foreground">
                          {p.patientennummer} · {alterJahre(p.geburtsdatum)} Jahre
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {offene.length === 0 ? (
                            p.wunden.length === 0
                              ? "Keine Wunde dokumentiert"
                              : "Alle Wunden abgeschlossen"
                          ) : (
                            <>
                              {offene.length === 1
                                ? "1 offene Wunde"
                                : `${offene.length} offene Wunden`}
                              {" · "}
                              {offene
                                .slice(0, 2)
                                .map((w) =>
                                  labelVon(DIAGNOSE_TYPEN, w.diagnoseTyp),
                                )
                                .join(", ")}
                            </>
                          )}
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
          })}
        </ul>
      )}
    </div>
  );
}
