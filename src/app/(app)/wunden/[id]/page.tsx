import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Columns2, FileDown, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Verlaufsdiagramme } from "@/components/auswertung/verlaufsdiagramme";
import { WundeKopf } from "@/components/wunde/wunde-kopf";
import { Zeitleiste } from "@/components/wunde/zeitleiste";
import { gruppiereWundgrund } from "@/lib/auswertung";
import { EXSUDAT_MENGEN, EXSUDAT_STUFE, labelVon } from "@/lib/enums";
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
      arzt: true,
      pflegedienst: true,
      aufnahmen: {
        where: { geloeschtAm: null },
        orderBy: { datum: "desc" },
        include: {
          erstelltVon: { select: { name: true, handzeichen: true } },
          _count: { select: { fotos: { where: { geloeschtAm: null } } } },
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
  const verlaufsdaten = wunde.aufnahmen
    .filter((aufnahme) => !aufnahme.istEntwurf)
    .toReversed()
    .map((aufnahme) => {
      const wundgrund = leseAuswahl(aufnahme.wundgrund);
      return {
        id: aufnahme.id,
        datum: aufnahme.datum.toISOString(),
        flaeche: flaecheMm2(aufnahme),
        breiteMm: aufnahme.breiteMm,
        laengeMm: aufnahme.laengeMm,
        tiefeMm: aufnahme.tiefeMm,
        schmerzVas: aufnahme.schmerzen ? (aufnahme.schmerzVas ?? null) : 0,
        exsudatStufe: aufnahme.exsudatMenge
          ? (EXSUDAT_STUFE[aufnahme.exsudatMenge] ?? null)
          : null,
        exsudatLabel: labelVon(EXSUDAT_MENGEN, aufnahme.exsudatMenge),
        wundgrund: gruppiereWundgrund(wundgrund),
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${wunde.patient.nachname}, ${wunde.patient.vorname}`, href: `/patienten/${wunde.patientId}` },
        ]} />
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

      {!hatAufnahmen ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Verlauf</h2>
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
        </section>
      ) : (
        <>
          {verlaufsdaten.length > 0 && (
            <section className="space-y-4" aria-labelledby="auswertung-titel">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="auswertung-titel" className="text-lg font-semibold">Auswertung</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Messwerte aus abgeschlossenen Aufnahmen in zeitlicher Reihenfolge.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {verlaufsdaten.length >= 2 && (
                    <Button variant="outline" asChild>
                      <Link href={`/wunden/${id}/vergleich`}>
                        <Columns2 aria-hidden="true" />
                        Aufnahmen vergleichen
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <a href={`/api/wunden/${id}/pdf`}>
                      <FileDown aria-hidden="true" />
                      Verlauf als PDF
                    </a>
                  </Button>
                </div>
              </div>
              <Verlaufsdiagramme daten={verlaufsdaten} />
            </section>
          )}

          <section className="space-y-4" aria-labelledby="aufnahmen-titel">
            <div>
              <h2 id="aufnahmen-titel" className="text-lg font-semibold">Aufnahmen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Neueste Dokumentation zuerst, einschließlich gespeicherter Entwürfe.
              </p>
            </div>
          <Zeitleiste eintraege={eintraege} />
          </section>
        </>
      )}
    </div>
  );
}
