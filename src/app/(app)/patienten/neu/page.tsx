import { PatientFormular } from "@/components/patient/patient-formular";
import { patientAnlegen } from "@/actions/patienten";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Patient anlegen" };

export default async function NeuerPatientSeite() {
  const [aerzte, pflegedienste] = await Promise.all([
    db.doctor.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, praxis: true } }),
    db.careService.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumb eintraege={[{ label: "Patienten", href: "/" }]} />
        <h1 className="mt-2 text-2xl font-semibold">Patient anlegen</h1>
      </div>

      <PatientFormular action={patientAnlegen} abbrechenNach="/" absendeText="Patient anlegen" aerzte={aerzte} pflegedienste={pflegedienste} />
    </div>
  );
}
