"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import Link from "next/link";
import { dokumentHochladen, type DokumentZustand } from "@/actions/dokumente";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

const START: DokumentZustand = {};

export function DokumentUpload({
  patientId,
  typ,
}: {
  patientId: string;
  typ: "REZEPT" | "ARZTBRIEF";
}) {
  const [zustand, action, laeuft] = useActionState(dokumentHochladen.bind(null, patientId), START);
  const bezeichnung = typ === "REZEPT" ? "Rezept" : "Arztbrief";

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form
          action={action}
          className="space-y-5"
          data-aenderungen-warnung="dokument"
        >
          <input type="hidden" name="typ" value={typ} />
          <Field id="dokument-titel" label="Titel" pflicht>
            {(p) => (
              <Input
                {...p}
                name="titel"
                maxLength={150}
                placeholder={`z. B. ${bezeichnung} vom 19.09.2026`}
                required
              />
            )}
          </Field>
          <Field
            id="dokument-datei"
            label="Foto oder PDF"
            pflicht
            hilfe="PDF, JPEG, PNG, WebP oder HEIC · maximal 20 MB"
          >
            {(p) => (
              <Input
                {...p}
                name="datei"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                required
              />
            )}
          </Field>
          {zustand.meldung && (
            <p role="status" className={`text-sm ${zustand.erfolg ? "text-accent" : "text-destructive"}`}>
              {zustand.meldung}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button variant="outline" asChild>
              <Link href={`/patienten/${patientId}/dokumente?typ=${typ}`}>Abbrechen</Link>
            </Button>
            <Button type="submit" laedt={laeuft}>
              <Upload aria-hidden="true" />
              {bezeichnung} hinzufügen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
