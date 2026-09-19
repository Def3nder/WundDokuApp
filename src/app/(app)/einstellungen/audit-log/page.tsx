import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AUDIT_AKTIONEN, labelVon } from "@/lib/enums";

export const metadata = { title: "Änderungsprotokoll" };

const ANZAHL = 200;

const ENTITAETEN = [
  { wert: "Patient", label: "Patient" },
  { wert: "Wound", label: "Wunde" },
  { wert: "Assessment", label: "Aufnahme" },
  { wert: "Photo", label: "Foto" },
  { wert: "PatientDocument", label: "Dokument" },
  { wert: "Doctor", label: "Arzt" },
  { wert: "CareService", label: "Pflegedienst" },
  { wert: "User", label: "Benutzer" },
] as const;

function labelVonEntitaet(wert: string): string {
  return ENTITAETEN.find((e) => e.wert === wert)?.label ?? wert;
}

function zeitpunktText(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FilterChip({ label, aktiv, href }: { label: string; aktiv: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "tippziel rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200",
        aktiv
          ? "bg-secondary text-on-secondary"
          : "bg-surface-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export default async function AuditLogSeite({
  searchParams,
}: {
  searchParams: Promise<{ entitaet?: string }>;
}) {
  const sitzung = await auth();
  // Serverseitig pruefen, nicht nur den Navigationspunkt ausblenden.
  if (sitzung?.user?.rolle !== "ADMIN") redirect("/");

  const { entitaet } = await searchParams;
  const gefiltert = entitaet && ENTITAETEN.some((e) => e.wert === entitaet) ? entitaet : undefined;

  const eintraege = await db.auditLog.findMany({
    where: gefiltert ? { entitaet: gefiltert } : undefined,
    orderBy: { zeitpunkt: "desc" },
    take: ANZAHL,
    include: { user: { select: { name: true, handzeichen: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Änderungsprotokoll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zeigt die letzten {ANZAHL} Einträge
          {gefiltert ? ` im Bereich „${labelVonEntitaet(gefiltert)}"` : ""}.
        </p>
      </div>

      <nav aria-label="Nach Bereich filtern" className="flex flex-wrap gap-2">
        <FilterChip label="Alle" aktiv={!gefiltert} href="/einstellungen/audit-log" />
        {ENTITAETEN.map((e) => (
          <FilterChip
            key={e.wert}
            label={e.label}
            aktiv={gefiltert === e.wert}
            href={`/einstellungen/audit-log?entitaet=${e.wert}`}
          />
        ))}
      </nav>

      <Card>
        <CardContent className="p-0">
          {eintraege.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Keine Einträge vorhanden.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Zeitpunkt</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Benutzer</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Bereich</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aktion</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {eintraege.map((e) => (
                    <tr key={e.id}>
                      <td className="tabular whitespace-nowrap px-4 py-3 align-top">{zeitpunktText(e.zeitpunkt)}</td>
                      <td className="px-4 py-3 align-top">
                        {e.user ? `${e.user.name} (${e.user.handzeichen})` : "System"}
                      </td>
                      <td className="px-4 py-3 align-top">{labelVonEntitaet(e.entitaet)}</td>
                      <td className="px-4 py-3 align-top">{labelVon(AUDIT_AKTIONEN, e.aktion)}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{e.details ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
