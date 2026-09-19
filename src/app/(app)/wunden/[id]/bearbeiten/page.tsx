import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { WundeFormular } from "@/components/wunde/wunde-formular";
import { wundeAendern } from "@/actions/wunden";

export const metadata = { title: "Wunde bearbeiten" };

export default async function WundeBearbeitenSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wunde = await db.wound.findUnique({ where: { id } });
  if (!wunde || wunde.geloeschtAm) notFound();

  const action = wundeAendern.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/wunden/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {wunde.bezeichnung}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Wunde bearbeiten</h1>
      </div>

      <WundeFormular
        action={action}
        abbrechenNach={`/wunden/${id}`}
        vorgabe={{
          bezeichnung: wunde.bezeichnung,
          diagnoseTyp: wunde.diagnoseTyp,
          diagnoseFreitext: wunde.diagnoseFreitext ?? "",
          lokalisationRegion: wunde.lokalisationRegion ?? "",
          lokalisationSeite: wunde.lokalisationSeite ?? "",
          lokalisationAusrichtung: wunde.lokalisationAusrichtung ?? "",
          lokalisationFreitext: wunde.lokalisationFreitext ?? "",
          bestehtSeitWert: wunde.bestehtSeitWert?.toString() ?? "",
          bestehtSeitEinheit: wunde.bestehtSeitEinheit ?? "MONATE",
          rezidiv: wunde.rezidiv,
          rezidivAnzahl: wunde.rezidivAnzahl?.toString() ?? "",
        }}
      />
    </div>
  );
}
