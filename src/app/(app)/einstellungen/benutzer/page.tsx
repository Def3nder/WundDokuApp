import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, LockOpen, Plus, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { benutzerAktivSetzen } from "@/actions/benutzer";
import { ROLLEN, labelVon } from "@/lib/enums";

export const metadata = { title: "Benutzer" };

export default async function BenutzerSeite() {
  const sitzung = await auth();
  // Serverseitig pruefen, nicht nur den Navigationspunkt ausblenden.
  if (sitzung?.user?.rolle !== "ADMIN") redirect("/");

  const benutzer = await db.user.findMany({
    orderBy: [{ aktiv: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      handzeichen: true,
      rolle: true,
      aktiv: true,
      _count: { select: { aufnahmen: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Benutzer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Konten werden gesperrt statt gelöscht, damit die Zuordnung von
            Aufnahmen zum Handzeichen erhalten bleibt.
          </p>
        </div>
        <Button asChild>
          <Link href="/einstellungen/benutzer/neu">
            <Plus aria-hidden="true" />
            Benutzer anlegen
          </Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {benutzer.map((b) => {
          const selbst = b.id === sitzung.user.id;
          return (
            <li key={b.id}>
              <Card className={b.aktiv ? undefined : "opacity-60"}>
                <CardContent className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{b.name}</p>
                      <span className="tabular rounded bg-surface-muted px-1.5 py-0.5 text-xs font-medium">
                        {b.handzeichen}
                      </span>
                      {b.rolle === "ADMIN" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-on-secondary">
                          <ShieldCheck className="size-3.5" aria-hidden="true" />
                          {labelVon(ROLLEN, b.rolle)}
                        </span>
                      )}
                      {!b.aktiv && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-neutral/15 px-2 py-0.5 text-xs font-medium text-status-neutral">
                          <Lock className="size-3.5" aria-hidden="true" />
                          Gesperrt
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{b.email}</p>
                    <p className="tabular mt-1 text-xs text-muted-foreground">
                      {b._count.aufnahmen === 1
                        ? "1 Aufnahme erfasst"
                        : `${b._count.aufnahmen} Aufnahmen erfasst`}
                    </p>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await benutzerAktivSetzen(b.id, !b.aktiv);
                    }}
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={selbst}
                      title={selbst ? "Das eigene Konto kann nicht gesperrt werden" : undefined}
                    >
                      {b.aktiv ? (
                        <>
                          <Lock aria-hidden="true" />
                          Sperren
                        </>
                      ) : (
                        <>
                          <LockOpen aria-hidden="true" />
                          Entsperren
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
