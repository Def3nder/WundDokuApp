import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PatientFormular } from "@/components/patient/patient-formular";
import { patientAendern } from "@/actions/patienten";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Patient bearbeiten" };

export default async function PatientBearbeitenSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, aerzte, pflegedienste] = await Promise.all([
    db.patient.findUnique({ where: { id } }),
    db.doctor.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, praxis: true } }),
    db.careService.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, ansprechpartner: true } }),
  ]);
  if (!patient || patient.geloeschtAm) notFound();

  // Die Action braucht die Id; useActionState reicht nur (zustand, formData).
  const action = patientAendern.bind(null, id);

  return (
    <div className="page-fluid min-w-0 w-full space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${patient.nachname}, ${patient.vorname}`, href: `/patienten/${id}` },
        ]} />
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
          arztId: patient.arztId ?? "",
          neuerArztName: "",
          neueArztPraxis: "",
          pflegedienstId: patient.pflegedienstId ?? "",
          neuerPflegedienstName: "",
          neuerPflegedienstAnsprechpartner: "",
          notizen: patient.notizen ?? "",
        }}
        aerzte={aerzte}
        pflegedienste={pflegedienste}
      />
    </div>
  );
}
