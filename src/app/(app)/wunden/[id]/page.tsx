import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WundeKopf } from "@/components/wunde/wunde-kopf";
import { Zeitleiste } from "@/components/wunde/zeitleiste";
import { flaecheMm2 } from "@/lib/wundmasse";
import { leseAuswahl } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await db.wound.findUnique({ where: { id } });
  return { title: w?.bezeichnung ?? "Wunde" };
}

export default async function WundeSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const wunde = await db.wound.findUnique({
    where: { id },
    include: {
      patient: true,
      aufnahmen: {
        where: { geloeschtAm: null },
        orderBy: { datum: "desc" },
        include: {
          erstelltVon: { select: { name: true, handzeichen: true } },
          _count: { select: { fotos: true } },
        },
      },
    },
  });

  if (!wunde || wunde.geloeschtAm) notFound();

  // Flaeche und Wundgrund einmal hier aufbereiten - die Zeitleiste soll
  // keine Fachlogik enthalten.
  const eintraege = wunde.aufnahmen.map((a) => ({
    id: a.id,
    typ: a.typ,
    datum: a.datum,
    istEntwurf: a.istEntwurf,
    breiteMm: a.breiteMm,
    laengeMm: a.laengeMm,
    tiefeMm: a.tiefeMm,
    flaeche: flaecheMm2(a),
    exsudatMenge: a.exsudatMenge,
    schmerzen: a.schmerzen,
    schmerzVas: a.schmerzVas,
    wundgrund: leseAuswahl(a.wundgrund),
    infektzeichen: leseAuswahl(a.lokaleInfektzeichen),
    systemischeZeichen: a.systemischeZeichen,
    anzahlFotos: a._count.fotos,
    handzeichen: a.erstelltVon?.handzeichen ?? null,
  }));

  const hatAufnahmen = eintraege.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/patienten/${wunde.patientId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {wunde.patient.nachname}, {wunde.patient.vorname}
        </Link>
      </div>

      <WundeKopf wunde={wunde} anzahlAufnahmen={eintraege.length} />

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/wunden/${id}/aufnahmen/neu`}>
            <Plus aria-hidden="true" />
            {hatAufnahmen ? "Folgeaufnahme erfassen" : "Erstaufnahme erfassen"}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/wunden/${id}/bearbeiten`}>
            <Pencil aria-hidden="true" />
            Wunde bearbeiten
          </Link>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Verlauf</h2>

        {!hatAufnahmen ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ClipboardList className="size-10 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">Noch keine Aufnahme erfasst</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Mit der Erstaufnahme werden Befund, Wundgröße, Schmerz und
                Therapieplan dokumentiert. Jede weitere Aufnahme wird damit
                vorbefüllt.
              </p>
              <Button asChild className="mt-2">
                <Link href={`/wunden/${id}/aufnahmen/neu`}>
                  <Plus aria-hidden="true" />
                  Erstaufnahme erfassen
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Zeitleiste eintraege={eintraege} />
        )}
      </section>
    </div>
  );
}
