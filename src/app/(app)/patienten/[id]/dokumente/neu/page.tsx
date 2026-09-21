import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DokumentUpload } from "@/components/patient/dokument-upload";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Dokument hinzufügen" };

export default async function NeuesDokumentSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ typ?: string }>;
}) {
  const [{ id }, suche] = await Promise.all([params, searchParams]);
  const typ = suche.typ;
  if (typ !== "REZEPT" && typ !== "ARZTBRIEF") notFound();

  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.geloeschtAm) notFound();

  const bezeichnung = typ === "REZEPT" ? "Rezept" : "Arztbrief";
  const titel = typ === "REZEPT" ? "Rezepte" : "Arztbriefe";

  return (
    <div className="page-fluid min-w-0 w-full space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${patient.nachname}, ${patient.vorname}`, href: `/patienten/${id}` },
          { label: titel, href: `/patienten/${id}/dokumente?typ=${typ}` },
        ]} />
        <h1 className="mt-2 text-2xl font-semibold">{bezeichnung} hinzufügen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lade den {typ === "REZEPT" ? "Rezeptbeleg" : "Arztbrief"} als Foto oder PDF hoch.
        </p>
      </div>

      <DokumentUpload patientId={id} typ={typ} />
    </div>
  );
}
