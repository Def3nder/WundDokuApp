import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { arbeitstageAus, lokaleZeit, minutenText, vorgabeAm, WOCHENTAGE } from "@/lib/arbeitszeit";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VorgabenKnopf, VorgabenListe } from "@/components/zeiterfassung/vorgaben";

export const metadata = { title: "Arbeitszeit-Einstellungen" };

export default async function ZeitEinstellungenSeite() {
  const sitzung = await verlangeSitzung();
  const daten = await db.timeSettings.findMany({ where: { userId: sitzung.user.id }, orderBy: { abDatum: "desc" } });
  const vorgaben = daten.map((v) => ({ ...v, arbeitstage: arbeitstageAus(v.arbeitstage) }));
  const heute = lokaleZeit(new Date()).slice(0, 10);
  const aktuell = vorgabeAm(vorgaben, heute);
  return <div className="space-y-6">
    <Button variant="link" asChild><Link href="/zeiterfassung"><ArrowLeft aria-hidden="true" />Zeiterfassung</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Meine Arbeitszeit-Einstellungen</h1><p className="mt-1 text-sm text-muted-foreground">Tagesvorlage, Pause und Wochenarbeitszeit für {sitzung.user.name}.</p></div>
      <VorgabenKnopf vorgabe={aktuell} heute={heute} />
    </div>
    <Card><CardHeader><CardTitle>Aktuell gültig</CardTitle></CardHeader><CardContent>
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[['Arbeitsbeginn / Ende', `${aktuell.standardBeginn}–${aktuell.standardEnde} Uhr`], ['Standardpause', `${aktuell.pauseMinuten} Minuten`], ['Wochenarbeitszeit', minutenText(aktuell.wochenMinuten)], ['Arbeitstage', aktuell.arbeitstage.map((t) => WOCHENTAGE[t - 1]).join(', ')]].map(([label, wert]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{wert}</dd></div>)}
      </dl>
      {!vorgaben.some((v) => v.abDatum <= heute) && <p className="mt-5 text-sm text-muted-foreground">Bisher gilt die Grundeinstellung. Lege eine eigene Vorgabe mit dem gewünschten Startdatum an.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Vorgaben im Verlauf</CardTitle></CardHeader><CardContent>
      {vorgaben.length ? <VorgabenListe vorgaben={vorgaben} heute={heute} /> : <p className="py-4 text-sm text-muted-foreground">Noch keine eigenen Vorgaben gespeichert.</p>}
    </CardContent></Card>
    <p className="text-sm text-muted-foreground">Wochenstunden werden auf die gewählten Arbeitstage verteilt. Urlaub, Krankheit und Feiertage werden derzeit nicht automatisch berücksichtigt. Alle Datum- und Uhrzeitangaben verwenden Europe/Berlin.</p>
  </div>;
}
