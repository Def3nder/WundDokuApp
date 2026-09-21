import { notFound } from "next/navigation";
import { CopyCheck } from "lucide-react";
import { db } from "@/lib/db";
import { AufnahmeFormular } from "@/components/formular/aufnahme-formular";
import { aufnahmeAnlegen } from "@/actions/aufnahmen";
import { aufnahmeZuWerten, vorbefuellungAus } from "@/lib/schema/aufnahme-vorgabe";
import { flaecheMm2 } from "@/lib/wundmasse";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { datum } from "@/lib/wundtext";
import { fotoZuAnsicht } from "@/lib/foto-typen";

export const metadata = { title: "Aufnahme erfassen" };

export default async function NeueAufnahmeSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wunde, letzte, entwurf] = await Promise.all([
    db.wound.findUnique({ where: { id }, include: { patient: true } }),
    db.assessment.findFirst({
      where: { woundId: id, geloeschtAm: null, istEntwurf: false },
      orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
    }),
    db.assessment.findFirst({
      where: { woundId: id, geloeschtAm: null, istEntwurf: true },
      orderBy: { updatedAt: "desc" },
      include: {
        fotos: {
          where: { geloeschtAm: null },
          orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

  if (!wunde || wunde.geloeschtAm || wunde.patient.geloeschtAm) notFound();

  let vorgabe = vorbefuellungAus(letzte);
  if (entwurf) {
    const entwurfWerte = aufnahmeZuWerten(entwurf);
    vorgabe = {
      ...vorgabe,
      datum: entwurfWerte.datum,
      anmerkungen: entwurfWerte.anmerkungen,
    };
  }

  const action = aufnahmeAnlegen.bind(null, id);
  const vorherigeFlaeche = letzte ? flaecheMm2(letzte) : null;

  return (
    <div className="page-fluid min-w-0 w-full space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${wunde.patient.nachname}, ${wunde.patient.vorname}`, href: `/patienten/${wunde.patientId}` },
          { label: wunde.bezeichnung, href: `/wunden/${id}` },
        ]} />
        <h1 className="mt-2 text-2xl font-semibold">
          {letzte ? "Folgeaufnahme erfassen" : "Erstaufnahme erfassen"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {wunde.patient.nachname}, {wunde.patient.vorname} · {wunde.bezeichnung}
        </p>
      </div>

      {letzte && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">
          <CopyCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Befund vom {datum(letzte.datum)} übernommen</p>
            <p className="mt-0.5 text-muted-foreground">
              Alle Angaben lassen sich überschreiben. Breite, Länge und Tiefe bitte neu messen.
            </p>
          </div>
        </div>
      )}

      <AufnahmeFormular
        action={action}
        vorgabe={vorgabe}
        diagnoseTyp={wunde.diagnoseTyp}
        abbrechenNach={`/wunden/${id}`}
        vorherigeFlaeche={vorherigeFlaeche}
        vorherigesDatum={letzte ? datum(letzte.datum) : null}
        autosaveWundeId={id}
        initialEntwurfId={entwurf?.id ?? null}
        aufnahmeId={entwurf?.id ?? null}
        initialFotos={entwurf?.fotos.map(fotoZuAnsicht) ?? []}
        absendeText={letzte ? "Folgeaufnahme speichern" : "Erstaufnahme speichern"}
        istFolgeaufnahme={Boolean(letzte)}
      />
    </div>
  );
}
