import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WundeFormular } from "@/components/wunde/wunde-formular";
import { wundeAnlegen } from "@/actions/wunden";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Wunde anlegen" };

export default async function NeueWundeSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.geloeschtAm) notFound();
  const [aerzte, pflegedienste] = await Promise.all([
    db.doctor.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, praxis: true } }),
    db.careService.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, ansprechpartner: true } }),
  ]);

  const action = wundeAnlegen.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${patient.nachname}, ${patient.vorname}`, href: `/patienten/${id}` },
        ]} />
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
        aerzte={aerzte}
        pflegedienste={pflegedienste}
      />
    </div>
  );
}
