import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { AufnahmeFormular } from "@/components/formular/aufnahme-formular";
import { aufnahmeAendern } from "@/actions/aufnahmen";
import { aufnahmeZuWerten } from "@/lib/schema/aufnahme-vorgabe";
import { flaecheMm2 } from "@/lib/wundmasse";
import { datum } from "@/lib/wundtext";
import { fotoZuAnsicht } from "@/lib/foto-typen";

export const metadata = { title: "Aufnahme bearbeiten" };

export default async function AufnahmeBearbeitenSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const aufnahme = await db.assessment.findUnique({
    where: { id },
    include: {
      wunde: { include: { patient: true } },
      fotos: {
        where: { geloeschtAm: null },
        orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (
    !aufnahme ||
    aufnahme.geloeschtAm ||
    aufnahme.wunde.geloeschtAm ||
    aufnahme.wunde.patient.geloeschtAm
  ) notFound();

  const vorherige = await db.assessment.findFirst({
    where: {
      woundId: aufnahme.woundId,
      geloeschtAm: null,
      istEntwurf: false,
      id: { not: aufnahme.id },
      datum: { lt: aufnahme.datum },
    },
    orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
  });
  const action = aufnahmeAendern.bind(null, id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/aufnahmen/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Aufnahme vom {datum(aufnahme.datum)}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Aufnahme bearbeiten</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {aufnahme.wunde.patient.nachname}, {aufnahme.wunde.patient.vorname} · {aufnahme.wunde.bezeichnung}
        </p>
      </div>

      <AufnahmeFormular
        action={action}
        vorgabe={aufnahmeZuWerten(aufnahme)}
        diagnoseTyp={aufnahme.wunde.diagnoseTyp}
        abbrechenNach={`/aufnahmen/${id}`}
        vorherigeFlaeche={vorherige ? flaecheMm2(vorherige) : null}
        vorherigesDatum={vorherige ? datum(vorherige.datum) : null}
        aufnahmeId={aufnahme.id}
        initialFotos={aufnahme.fotos.map(fotoZuAnsicht)}
        absendeText="Änderungen speichern"
      />
    </div>
  );
}
