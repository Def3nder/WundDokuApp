import Link from "next/link";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { db } from "@/lib/db";
import { verlangeSitzung } from "@/lib/auth";
import { arbeitstageAus, auswertung, datumPlus, datumText, gueltigesDatum, lokaleZeit, minutenText, nettoMinuten, vorgabeAm, wochentag, WOCHENTAGE, zeitAusEingabe, zeitraum, zeitText } from "@/lib/arbeitszeit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuchungKnopf, BuchungLoeschen, type BuchungAnsicht } from "@/components/zeiterfassung/buchung";
import { OfflineHinweis } from "@/components/zeiterfassung/offline-hinweis";
import { OfflineZeitProvider } from "@/components/zeiterfassung/offline-kontext";
import { Stechuhr } from "@/components/zeiterfassung/stechuhr";
import { cn } from "@/lib/utils";

export const metadata = { title: "Meine Zeiterfassung" };

export default async function ZeiterfassungSeite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sitzung = await verlangeSitzung();
  const query = await searchParams;
  const jetzt = new Date();
  const heute = lokaleZeit(jetzt).slice(0, 10);
  const datum = typeof query.datum === "string" && gueltigesDatum(query.datum) ? query.datum : heute;
  const ansicht = query.ansicht === "monat" ? "monat" : "woche";
  const { von, bis } = zeitraum(datum, ansicht);
  const [eintraege, laufend, einstellungen] = await Promise.all([
    db.timeEntry.findMany({ where: { userId: sitzung.user.id, geloeschtAm: null, beginn: { lt: zeitAusEingabe(`${bis}T00:00`)! }, ende: { gt: zeitAusEingabe(`${von}T00:00`)! } }, orderBy: { beginn: "desc" } }),
    db.timeEntry.findFirst({ where: { userId: sitzung.user.id, geloeschtAm: null, ende: null } }),
    db.timeSettings.findMany({ where: { userId: sitzung.user.id }, orderBy: { abDatum: "asc" } }),
  ]);
  const vorgaben = einstellungen.map((v) => ({ ...v, arbeitstage: arbeitstageAus(v.arbeitstage) }));
  const vorgabe = vorgabeAm(vorgaben, heute);
  const bericht = auswertung(eintraege, vorgaben, von, bis, heute);
  const saldo = bericht.netto - bericht.sollBisHeute;
  const laufendAnsicht = laufend ? { ...laufend, beginn: laufend.beginn.toISOString(), ende: null } : undefined;
  const href = (tag: string, art = ansicht) => `/zeiterfassung?ansicht=${art}&datum=${tag}`;
  const titel = ansicht === "monat" ? new Date(`${von}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }) : `${datumText(von)} – ${datumText(datumPlus(bis, -1))}`;
  const diagrammMax = Math.max(60, ...bericht.tage.flatMap((t) => [t.netto, t.soll]));
  const bekannt = [...eintraege, ...(laufend ? [laufend] : [])].map((e) => ({ id: e.id, beginn: e.beginn.toISOString(), ende: e.ende?.toISOString() ?? null }));
  return <OfflineZeitProvider userId={sitzung.user.id} bekannt={bekannt}><div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Meine Zeiterfassung</h1><p className="mt-1 text-sm text-muted-foreground">Arbeitszeiten und Überblick für {sitzung.user.name}.</p></div>
      <Button asChild variant="outline"><Link href="/zeiterfassung/einstellungen"><Settings2 aria-hidden="true" />Arbeitszeit-Einstellungen</Link></Button>
    </div>

    <OfflineHinweis vorgabe={vorgabe} />
    <Stechuhr laufend={laufendAnsicht} serverJetzt={jetzt.toISOString()} vorgabe={vorgabe} />

    <section aria-labelledby="auswertung-titel" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="auswertung-titel" className="text-xl font-semibold">Auswertung</h2>
        <nav aria-label="Auswertungszeitraum" className="inline-flex rounded-lg border border-border bg-surface p-1">
          {([['woche', 'Woche'], ['monat', 'Monat']] as const).map(([art, text]) => <Link key={art} href={href(datum, art)} aria-current={ansicht === art ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-md px-5 text-sm font-medium", ansicht === art ? "bg-secondary text-on-secondary" : "text-muted-foreground hover:bg-surface-muted")}>{text}</Link>)}
        </nav>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Button asChild variant="ghost" size="icon"><Link href={href(datumPlus(von, -1))} aria-label="Vorheriger Zeitraum"><ChevronLeft aria-hidden="true" /></Link></Button>
          <h3 className="min-w-0 text-center text-base font-semibold sm:text-lg">{titel}</h3>
          <Button asChild variant="ghost" size="icon"><Link href={href(bis)} aria-label="Nächster Zeitraum"><ChevronRight aria-hidden="true" /></Link></Button>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={href(heute)}>Heute</Link></Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { titel: 'Arbeitszeit netto', wert: minutenText(bericht.netto), hinweis: 'Abgeschlossene Buchungen ohne Pausen' },
          { titel: 'Soll im Zeitraum', wert: minutenText(bericht.soll), hinweis: `${minutenText(bericht.sollBisHeute)} Soll bis einschließlich heute` },
          { titel: 'Saldo bis heute', wert: minutenText(saldo, true), hinweis: 'Netto minus Soll bis einschließlich heute' },
          { titel: 'Pausen', wert: minutenText(bericht.pause), hinweis: 'In abgeschlossenen Buchungen' },
        ].map((k) => <Card key={k.titel}><CardContent className="space-y-2 py-5"><h3 className="text-sm font-medium text-muted-foreground">{k.titel}</h3><p className="tabular text-3xl font-semibold tracking-tight">{k.wert}</p><p className="text-xs text-muted-foreground">{k.hinweis}</p></CardContent></Card>)}
      </div>
      {laufend && <p className="text-sm text-muted-foreground">Die laufende Stechuhr zählt erst nach dem Ausstempeln zur Auswertung.</p>}
      <Card><CardHeader><CardTitle>Tagesübersicht</CardTitle><p className="text-sm text-muted-foreground">Arbeitszeit und Soll je Kalendertag</p></CardHeader><CardContent>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2 pb-3 text-right text-xs font-medium text-muted-foreground sm:grid-cols-[6rem_minmax(3rem,1fr)_5rem_5rem_5rem]"><span className="text-left">Tag</span><span className="hidden sm:block" /><span>Netto</span><span>Soll</span><span>Saldo</span></div>
          {bericht.tage.map((t) => <div key={t.datum} className={cn("grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2 py-2.5 text-right text-xs sm:grid-cols-[6rem_minmax(3rem,1fr)_5rem_5rem_5rem] sm:text-sm", t.datum === heute && "font-semibold")}>
            <div className="text-left"><span className="mr-1 text-muted-foreground">{WOCHENTAGE[wochentag(t.datum) - 1]}</span><span>{datumText(t.datum, true)}</span></div>
            <div className="relative hidden h-2 rounded-full bg-surface-muted sm:block" aria-hidden="true"><div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${t.netto / diagrammMax * 100}%` }} /><span className="absolute -top-1 h-4 w-0.5 bg-muted-foreground" style={{ left: `${Math.min(99, t.soll / diagrammMax * 100)}%` }} /></div>
            <span className="tabular">{minutenText(t.netto)}</span><span className="tabular text-muted-foreground">{minutenText(t.soll)}</span><span className="tabular">{t.datum > heute ? "–" : minutenText(t.netto - t.soll, true)}</span>
          </div>)}
        </div>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Das Soll folgt den datierten Wochenvorgaben und Arbeitstagen. Feiertage, Urlaub und Krankheit werden noch nicht berücksichtigt. Bei Buchungen über Mitternacht werden Arbeitszeit und Pause anteilig auf die Tage verteilt.</p>
    </section>

    <section aria-labelledby="buchungen-titel" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="buchungen-titel" className="text-xl font-semibold">Buchungen im Zeitraum <span className="text-muted-foreground">({eintraege.length})</span></h2><BuchungKnopf modus="neu" vorgabe={vorgabe} /></div>
      <Card><CardContent className="py-2">
        {eintraege.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Noch keine abgeschlossenen Buchungen in diesem Zeitraum. Stemple ein oder trage eine Zeit nach.</p> : <ul className="divide-y divide-border">
          {eintraege.map((e) => {
            const ansicht: BuchungAnsicht = { ...e, beginn: e.beginn.toISOString(), ende: e.ende?.toISOString() ?? null };
            return <li key={`${e.id}-${e.version}`} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 space-y-1"><p className="text-sm font-medium">{zeitText(e.beginn)} – {zeitText(e.ende!)}</p><p className="text-sm text-muted-foreground">{minutenText(nettoMinuten(e))} netto · {e.pauseMinuten} Min. Pause</p>{e.notiz && <p className="break-words text-sm text-muted-foreground">{e.notiz}</p>}</div>
              <div className="flex shrink-0 gap-1"><BuchungKnopf eintrag={ansicht} modus="edit" vorgabe={vorgabe} /><BuchungLoeschen eintrag={ansicht} /></div>
            </li>;
          })}
        </ul>}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Alle Angaben in Europe/Berlin. Buchungen zeigen die vollständige Schicht; die Auswertung zählt nur den Anteil im gewählten Zeitraum.</p>
    </section>
  </div></OfflineZeitProvider>;
}
