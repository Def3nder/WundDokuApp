import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PatientFormular } from "@/components/patient/patient-formular";
import { patientAendern } from "@/actions/patienten";

export const metadata = { title: "Patient bearbeiten" };

export default async function PatientBearbeitenSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.geloeschtAm) notFound();

  // Die Action braucht die Id; useActionState reicht nur (zustand, formData).
  const action = patientAendern.bind(null, id);

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
        <h1 className="mt-2 text-2xl font-semibold">Stammdaten bearbeiten</h1>
      </div>

      <PatientFormular
        action={action}
        abbrechenNach={`/patienten/${id}`}
        vorgabe={{
          nachname: patient.nachname,
          vorname: patient.vorname,
          geburtsdatum: patient.geburtsdatum.toISOString().slice(0, 10),
          patientennummer: patient.patientennummer,
          arztTherapieverantwortlich: patient.arztTherapieverantwortlich ?? "",
          notizen: patient.notizen ?? "",
        }}
      />
    </div>
  );
}
