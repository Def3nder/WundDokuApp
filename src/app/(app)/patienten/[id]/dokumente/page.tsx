import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, Plus, ReceiptText, Trash2 } from "lucide-react";
import { dokumentLoeschen } from "@/actions/dokumente";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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
        <ul className="space-y-3">
          {patient.dokumente.map((dokument) => (
            <li key={dokument.id}>
              <Card className="hover:border-primary">
                <CardContent className="flex items-center gap-2 p-0">
                  <a
                    href={`/api/documents/${dokument.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-l-xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{dokument.titel}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {dokument.dateiname} · {dokument.mimeType === "application/pdf" ? "PDF" : "Foto"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground tabular">
                        Hinzugefügt am {dokument.createdAt.toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </a>
                  <form action={dokumentLoeschen.bind(null, dokument.id)} className="pr-3">
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`${dokument.titel} löschen`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  );
}
