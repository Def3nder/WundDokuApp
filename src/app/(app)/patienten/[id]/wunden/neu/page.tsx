import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { WundeFormular } from "@/components/wunde/wunde-formular";
import { wundeAnlegen } from "@/actions/wunden";

export const metadata = { title: "Wunde anlegen" };

export default async function NeueWundeSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.geloeschtAm) notFound();

  const action = wundeAnlegen.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/patienten/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {patient.nachname}, {patient.vorname}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Wunde anlegen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diese Angaben beschreiben die Wunde dauerhaft. Befund und Therapie
          werden anschließend je Aufnahme erfasst.
        </p>
      </div>

      <WundeFormular
        action={action}
        abbrechenNach={`/patienten/${id}`}
        absendeText="Wunde anlegen"
      />
    </div>
  );
}
