import { redirect } from "next/navigation";
import { ChevronRight, HeartHandshake, Plus, Save, Stethoscope, Trash2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { arztLoeschen, arztSpeichern, pflegedienstLoeschen, pflegedienstSpeichern } from "@/actions/stammdaten";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const metadata = { title: "Ärzte und Pflegedienste" };

export default async function StammdatenSeite() {
  const sitzung = await auth();
  if (sitzung?.user?.rolle !== "ADMIN") redirect("/");
  const [aerzte, pflegedienste] = await Promise.all([
    db.doctor.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" } }),
    db.careService.findMany({ where: { geloeschtAm: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Ärzte und Pflegedienste</h1>
        <p className="mt-1 text-sm text-muted-foreground">Zentrale Auswahllisten für das Anlegen und Bearbeiten von Wunden.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <StammdatenAbschnitt
          titel="Ärzte"
          einzahl="Arzt"
          icon={Stethoscope}
          farbe="primaer"
          eintraege={aerzte}
          neuAction={arztSpeichern.bind(null, null)}
          speichern={arztSpeichern}
          loeschen={arztLoeschen}
          zweitesFeld="Praxis"
          zweitesName="praxis"
        />
        <StammdatenAbschnitt
          titel="Pflegedienste"
          einzahl="Pflegedienst"
          icon={HeartHandshake}
          farbe="akzent"
          eintraege={pflegedienste}
          neuAction={pflegedienstSpeichern.bind(null, null)}
          speichern={pflegedienstSpeichern}
          loeschen={pflegedienstLoeschen}
          zweitesFeld="Ansprechpartner"
          zweitesName="ansprechpartner"
        />
      </div>
    </div>
  );
}

type Eintrag = { id: string; name: string; telefon: string | null; email: string | null; praxis?: string | null; ansprechpartner?: string | null };

function StammdatenAbschnitt({ titel, einzahl, icon: Icon, farbe, eintraege, neuAction, speichern, loeschen, zweitesFeld, zweitesName }: {
  titel: string;
  einzahl: string;
  icon: typeof Stethoscope;
  farbe: "primaer" | "akzent";
  eintraege: Eintrag[];
  neuAction: (fd: FormData) => Promise<void>;
  speichern: (id: string | null, fd: FormData) => Promise<void>;
  loeschen: (id: string) => Promise<void>;
  zweitesFeld: string;
  zweitesName: "praxis" | "ansprechpartner";
}) {
  const kopfFarbe = farbe === "primaer" ? "border-primary/30 bg-primary/5" : "border-accent/30 bg-accent/5";
  const iconFarbe = farbe === "primaer" ? "text-primary" : "text-accent";

  return (
    <section className={`overflow-hidden rounded-xl border ${kopfFarbe}`}>
      <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-background p-2 shadow-sm">
            <Icon className={`size-5 ${iconFarbe}`} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">{titel}</h2>
            <p className="text-xs text-muted-foreground tabular">{eintraege.length} Einträge</p>
          </div>
        </div>
      </div>

      <div className="bg-background p-3 sm:p-4">
        <details className="group mb-3 rounded-lg border border-dashed border-border-strong bg-surface-muted/30 open:border-solid open:bg-background">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <Plus className="size-4" aria-hidden="true" />
            {einzahl} hinzufügen
          </summary>
          <form
            action={neuAction}
            className="grid gap-3 border-t border-border p-4"
            data-aenderungen-warnung={`stammdaten-neu-${zweitesName}`}
          >
            <StammdatenFelder zweitesFeld={zweitesFeld} zweitesName={zweitesName} />
            <div className="flex justify-end">
              <Button type="submit"><Plus aria-hidden="true" />{einzahl} hinzufügen</Button>
            </div>
          </form>
        </details>

        <div className="overflow-hidden rounded-lg border border-border">
          {eintraege.map((eintrag, index) => (
            <details key={eintrag.id} className="group border-b border-border last:border-b-0 open:bg-surface-muted/30">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{eintrag.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {eintrag[zweitesName] || eintrag.telefon || eintrag.email || "Keine weiteren Angaben"}
                  </p>
                </div>
                <span className="sr-only">Eintrag {index + 1} bearbeiten</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <div className="border-t border-border px-3 py-4">
                <form
                  action={speichern.bind(null, eintrag.id)}
                  className="grid gap-3"
                  data-aenderungen-warnung={`stammdaten-${eintrag.id}`}
                >
                  <StammdatenFelder eintrag={eintrag} zweitesFeld={zweitesFeld} zweitesName={zweitesName} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="submit" variant="outline"><Save aria-hidden="true" />Änderungen speichern</Button>
                  </div>
                </form>
                <form action={loeschen.bind(null, eintrag.id)} className="mt-2 flex justify-end">
                  <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 aria-hidden="true" />Entfernen
                  </Button>
                </form>
              </div>
            </details>
          ))}
          {eintraege.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Noch keine Einträge vorhanden.</p>}
        </div>
      </div>
    </section>
  );
}

function StammdatenFelder({ eintrag, zweitesFeld, zweitesName }: {
  eintrag?: Eintrag;
  zweitesFeld: string;
  zweitesName: "praxis" | "ansprechpartner";
}) {
  return (
    <>
      <Input name="name" defaultValue={eintrag?.name} placeholder="Name" aria-label="Name" required />
      <Input name={zweitesName} defaultValue={eintrag?.[zweitesName] ?? ""} placeholder={zweitesFeld} aria-label={zweitesFeld} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="telefon" defaultValue={eintrag?.telefon ?? ""} placeholder="Telefon" aria-label="Telefon" />
        <Input name="email" type="email" defaultValue={eintrag?.email ?? ""} placeholder="E-Mail" aria-label="E-Mail" />
      </div>
    </>
  );
}
