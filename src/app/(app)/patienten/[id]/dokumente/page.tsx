import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Plus, ReceiptText } from "lucide-react";
import { dokumentLoeschen } from "@/actions/dokumente";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DokumentListe } from "@/components/patient/dokument-liste";

export const metadata = { title: "Patientendokumente" };

export default async function DokumenteSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ typ?: string }>;
}) {
  const [{ id }, suche] = await Promise.all([params, searchParams]);
  const typ = suche.typ;
  if (typ !== "REZEPT" && typ !== "ARZTBRIEF") notFound();

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      dokumente: {
        where: { geloeschtAm: null, typ },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!patient || patient.geloeschtAm) notFound();

  const istRezept = typ === "REZEPT";
  const titel = istRezept ? "Rezepte" : "Arztbriefe";
  const einzahl = istRezept ? "Rezept" : "Arztbrief";
  const Icon = istRezept ? ReceiptText : FileText;

  return (
    <div className="space-y-6">
      <Breadcrumb eintraege={[
        { label: "Patienten", href: "/" },
        { label: `${patient.nachname}, ${patient.vorname}`, href: `/patienten/${id}` },
      ]} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{titel}</h1>
          <Button asChild>
            <Link href={`/patienten/${id}/dokumente/neu?typ=${typ}`}>
              <Plus aria-hidden="true" />
              {einzahl} hinzufügen
            </Link>
          </Button>
        </div>

        {patient.dokumente.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Icon className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Noch kein {einzahl} hinterlegt</p>
            <p className="text-sm text-muted-foreground">Füge ein Dokument als Foto oder PDF hinzu.</p>
          </CardContent>
        </Card>
        ) : (
          <DokumentListe dokumente={patient.dokumente} typ={typ} dokumentLoeschen={dokumentLoeschen} />
        )}
      </section>
    </div>
  );
}
