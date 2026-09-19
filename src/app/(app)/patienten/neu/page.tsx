import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PatientFormular } from "@/components/patient/patient-formular";
import { patientAnlegen } from "@/actions/patienten";

export const metadata = { title: "Patient anlegen" };

export default function NeuerPatientSeite() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Patienten
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Patient anlegen</h1>
      </div>

      <PatientFormular action={patientAnlegen} abbrechenNach="/" absendeText="Patient anlegen" />
    </div>
  );
}
