import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WundeFormular } from "@/components/wunde/wunde-formular";
import { wundeAendern } from "@/actions/wunden";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Wunde bearbeiten" };

export default async function WundeBearbeitenSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wunde = await db.wound.findUnique({ where: { id }, include: { patient: true } });
  if (!wunde || wunde.geloeschtAm || wunde.patient.geloeschtAm) notFound();
  const [aerzte, pflegedienste] = await Promise.all([
    db.doctor.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true, praxis: true } }),
    db.careService.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const action = wundeAendern.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${wunde.patient.nachname}, ${wunde.patient.vorname}`, href: `/patienten/${wunde.patientId}` },
          { label: wunde.bezeichnung, href: `/wunden/${id}` },
          { label: "Wunde bearbeiten" },
        ]} />
        <h1 className="mt-2 text-2xl font-semibold">Wunde bearbeiten</h1>
      </div>

      <WundeFormular
        action={action}
        abbrechenNach={`/wunden/${id}`}
        vorgabe={{
          bezeichnung: wunde.bezeichnung,
          diagnoseTyp: wunde.diagnoseTyp,
          diagnoseFreitext: wunde.diagnoseFreitext ?? "",
          arztId: wunde.arztId ?? "",
          pflegedienstId: wunde.pflegedienstId ?? "",
          lokalisationRegion: wunde.lokalisationRegion ?? "",
          lokalisationSeite: wunde.lokalisationSeite ?? "",
          lokalisationAusrichtung: wunde.lokalisationAusrichtung ?? "",
          lokalisationFreitext: wunde.lokalisationFreitext ?? "",
          bestehtSeitWert: wunde.bestehtSeitWert?.toString() ?? "",
          bestehtSeitEinheit: wunde.bestehtSeitEinheit ?? "MONATE",
          rezidiv: wunde.rezidiv,
          rezidivAnzahl: wunde.rezidivAnzahl?.toString() ?? "",
        }}
        aerzte={aerzte}
        pflegedienste={pflegedienste}
      />
    </div>
  );
}
