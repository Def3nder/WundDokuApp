import Link from "next/link";
import { notFound } from "next/navigation";
import type { Assessment, Photo } from "@prisma/client";
import { ChevronLeft, FileSearch, ImageIcon, Info, MoveDownRight, MoveRight, MoveUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { VergleichAuswahl } from "@/components/auswertung/vergleich-auswahl";
import { FotoGalerie } from "@/components/foto/foto-galerie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wundgrundAenderung, zahlenDifferenz } from "@/lib/auswertung";
import { AUFNAHME_TYPEN, EXSUDAT_MENGEN, EXSUDAT_STUFE, WUNDGRUND, labelVon, labelsVon } from "@/lib/enums";
import { fotoZuAnsicht } from "@/lib/foto-typen";
import { flaecheMm2, flaechenTrend, formatiereMm, formatiereMm2, formatiereProzent } from "@/lib/wundmasse";
import { leseAuswahl } from "@/lib/utils";

export const metadata = { title: "Aufnahmen vergleichen" };

type Suchparameter = Promise<Record<string, string | string[] | undefined>>;

function datum(wert: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(wert);
}

function parameter(wert: string | string[] | undefined): string | undefined {
  return typeof wert === "string" ? wert : undefined;
}

function differenzText(wert: number | null, einheit: string): string {
  if (wert == null) return "Nicht vergleichbar";
  const zeichen = wert > 0 ? "+" : wert < 0 ? "−" : "±";
  const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(Math.abs(wert));
  return `${zeichen}${zahl}${einheit}`;
}

function aenderungsStil(wert: number | null): string {
  if (wert == null || wert === 0) return "text-muted-foreground";
  return wert < 0 ? "text-status-gut" : "text-status-schlecht";
}

function Aenderungswert({
  wert,
  text,
}: {
  wert: number | null;
  text: string;
}) {
  const Icon = wert == null || wert === 0 ? MoveRight : wert < 0 ? MoveDownRight : MoveUpRight;
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${aenderungsStil(wert)}`}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}

export default async function VergleichSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Suchparameter;
}) {
  const { id } = await params;
  const suchparameter = await searchParams;
  const wunde = await db.wound.findUnique({
    where: { id },
    include: {
      patient: true,
      aufnahmen: {
        where: { geloeschtAm: null, istEntwurf: false },
        orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
        include: {
          fotos: {
            where: { geloeschtAm: null },
            orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!wunde || wunde.geloeschtAm || wunde.patient.geloeschtAm) notFound();

  const aufnahmen = wunde.aufnahmen;
  const gewuenschtA = parameter(suchparameter.a);
  const gewuenschtB = parameter(suchparameter.b);
  const standardB = aufnahmen[0];
  const vergleich = aufnahmen.find((aufnahme) => aufnahme.id === gewuenschtB) ?? standardB;
  const ausgang =
    aufnahmen.find(
      (aufnahme) => aufnahme.id === gewuenschtA && aufnahme.id !== vergleich?.id,
    ) ?? aufnahmen.find((aufnahme) => aufnahme.id !== vergleich?.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link
          href={`/wunden/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {wunde.bezeichnung}
        </Link>
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Auswertung</p>
          <h1 className="mt-1 text-2xl font-semibold">Aufnahmen vergleichen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {wunde.patient.nachname}, {wunde.patient.vorname} · {wunde.bezeichnung}
          </p>
        </div>
      </div>

      {!ausgang || !vergleich ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSearch className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Mindestens zwei abgeschlossene Aufnahmen erforderlich</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              Entwürfe fließen nicht in den klinischen Vergleich ein. Schließen Sie eine weitere
              Aufnahme ab, um Messwerte und Fotos gegenüberzustellen.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link href={`/wunden/${id}`}>Zum Wund-Cockpit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <VergleichInhalt
          woundId={id}
          aufnahmen={aufnahmen}
          ausgang={ausgang}
          vergleich={vergleich}
        />
      )}
    </div>
  );
}

type VergleichAufnahme = Assessment & { fotos: Photo[] };

function VergleichInhalt({
  woundId,
  aufnahmen,
  ausgang,
  vergleich,
}: {
  woundId: string;
  aufnahmen: VergleichAufnahme[];
  ausgang: VergleichAufnahme;
  vergleich: VergleichAufnahme;
}) {
  const ausgangWundgrund = leseAuswahl(ausgang.wundgrund);
  const vergleichWundgrund = leseAuswahl(vergleich.wundgrund);
  const wundgrundDiff = wundgrundAenderung(ausgangWundgrund, vergleichWundgrund);
  const ausgangFlaeche = flaecheMm2(ausgang);
  const vergleichFlaeche = flaecheMm2(vergleich);
  const flaechenDifferenz = flaechenTrend(vergleichFlaeche, ausgangFlaeche, 0);
  const breiteDiff = zahlenDifferenz(ausgang.breiteMm, vergleich.breiteMm);
  const laengeDiff = zahlenDifferenz(ausgang.laengeMm, vergleich.laengeMm);
  const tiefeDiff = zahlenDifferenz(ausgang.tiefeMm, vergleich.tiefeMm);
  const ausgangVas = ausgang.schmerzen ? ausgang.schmerzVas : 0;
  const vergleichVas = vergleich.schmerzen ? vergleich.schmerzVas : 0;
  const vasDiff = zahlenDifferenz(ausgangVas, vergleichVas);
  const ausgangExsudat = ausgang.exsudatMenge ? (EXSUDAT_STUFE[ausgang.exsudatMenge] ?? null) : null;
  const vergleichExsudat = vergleich.exsudatMenge ? (EXSUDAT_STUFE[vergleich.exsudatMenge] ?? null) : null;
  const exsudatDiff = zahlenDifferenz(ausgangExsudat, vergleichExsudat);
  const optionen = aufnahmen.map((aufnahme) => ({
    id: aufnahme.id,
    label: `${datum(aufnahme.datum)} · ${labelVon(AUFNAHME_TYPEN, aufnahme.typ)} · ${aufnahme.fotos.length} ${aufnahme.fotos.length === 1 ? "Foto" : "Fotos"}`,
  }));

  return (
    <>
      <VergleichAuswahl
        woundId={woundId}
        optionen={optionen}
        ausgangId={ausgang.id}
        vergleichId={vergleich.id}
      />

      <div className="flex gap-3 rounded-xl border border-info/25 bg-secondary/60 p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
        <p>
          Fotos unterstützen die Verlaufseinschätzung, sind aber nicht maßstabsgetreu. Abstand,
          Perspektive und Beleuchtung können den optischen Eindruck verändern.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="fotovergleich-titel">
        <div>
          <h2 id="fotovergleich-titel" className="text-lg font-semibold">Fotovergleich</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Beide Aufnahmeserien bleiben auf breiten Ansichten direkt nebeneinander.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FotoSpalte titel="Ausgangsbefund" aufnahme={ausgang} />
          <FotoSpalte titel="Vergleichsbefund" aufnahme={vergleich} hervorgehoben />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Differenztabelle</CardTitle>
          <CardDescription>
            Änderung bedeutet Vergleichsaufnahme minus Ausgangsaufnahme. Grün markiert eine
            Abnahme, Rot eine Zunahme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Merkmal</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ausgang</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vergleich</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Änderung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="px-4 py-4 align-top font-medium">Wundmaße</th>
                  <td className="messwert px-4 py-4 align-top">{masseText(ausgang)}</td>
                  <td className="messwert px-4 py-4 align-top">{masseText(vergleich)}</td>
                  <td className="px-4 py-4 align-top text-muted-foreground">
                    B {differenzText(breiteDiff, " mm")} · L {differenzText(laengeDiff, " mm")} · T {differenzText(tiefeDiff, " mm")}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-4 align-top font-medium">Wundfläche</th>
                  <td className="messwert px-4 py-4 align-top">{formatiereMm2(ausgangFlaeche)}</td>
                  <td className="messwert px-4 py-4 align-top">{formatiereMm2(vergleichFlaeche)}</td>
                  <td className="px-4 py-4 align-top">
                    <Aenderungswert
                      wert={flaechenDifferenz?.differenz ?? null}
                      text={flaechenDifferenz ? `${formatiereProzent(flaechenDifferenz.prozent)} · ${differenzText(flaechenDifferenz.differenz, " mm²")}` : "Nicht vergleichbar"}
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-4 align-top font-medium">Exsudatmenge</th>
                  <td className="px-4 py-4 align-top">{labelVon(EXSUDAT_MENGEN, ausgang.exsudatMenge) || "–"}</td>
                  <td className="px-4 py-4 align-top">{labelVon(EXSUDAT_MENGEN, vergleich.exsudatMenge) || "–"}</td>
                  <td className="px-4 py-4 align-top">
                    <Aenderungswert wert={exsudatDiff} text={stufenText(exsudatDiff)} />
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-4 align-top font-medium">Schmerz-VAS</th>
                  <td className="messwert px-4 py-4 align-top">{vasText(ausgang.schmerzen, ausgang.schmerzVas)}</td>
                  <td className="messwert px-4 py-4 align-top">{vasText(vergleich.schmerzen, vergleich.schmerzVas)}</td>
                  <td className="px-4 py-4 align-top">
                    <Aenderungswert wert={vasDiff} text={differenzText(vasDiff, " Punkte")} />
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-4 align-top font-medium">Wundgrund</th>
                  <td className="px-4 py-4 align-top">{labelsVon(WUNDGRUND, ausgangWundgrund).join(", ") || "–"}</td>
                  <td className="px-4 py-4 align-top">{labelsVon(WUNDGRUND, vergleichWundgrund).join(", ") || "–"}</td>
                  <td className="px-4 py-4 align-top">
                    <WundgrundDifferenz {...wundgrundDiff} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FotoSpalte({
  titel,
  aufnahme,
  hervorgehoben = false,
}: {
  titel: string;
  aufnahme: VergleichAufnahme;
  hervorgehoben?: boolean;
}) {
  const fotos = aufnahme.fotos.map(fotoZuAnsicht);
  return (
    <Card className={hervorgehoben ? "border-primary/50" : undefined}>
      <CardHeader className={hervorgehoben ? "bg-secondary/35" : undefined}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{titel}</p>
        <CardTitle>{datum(aufnahme.datum)}</CardTitle>
        <CardDescription>{labelVon(AUFNAHME_TYPEN, aufnahme.typ)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fotos.length ? (
          <FotoGalerie fotos={fotos} kompakt />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted/50 px-4 text-center">
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Keine Fotos in dieser Aufnahme</p>
          </div>
        )}
        <Button asChild variant="link" className="px-0">
          <Link href={`/aufnahmen/${aufnahme.id}`}>Aufnahme vollständig öffnen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function masseText(aufnahme: VergleichAufnahme): string {
  return `${formatiereMm(aufnahme.breiteMm)} × ${formatiereMm(aufnahme.laengeMm)} × ${formatiereMm(aufnahme.tiefeMm)}`;
}

function vasText(schmerzen: boolean, wert: number | null): string {
  if (!schmerzen) return "0 / 10";
  return wert == null ? "Schmerzen, VAS fehlt" : `${wert} / 10`;
}

function stufenText(wert: number | null): string {
  if (wert == null) return "Nicht vergleichbar";
  if (wert === 0) return "Unverändert";
  const anzahl = Math.abs(wert);
  return `${anzahl} ${anzahl === 1 ? "Stufe" : "Stufen"} ${wert < 0 ? "weniger" : "mehr"}`;
}

function WundgrundDifferenz({
  hinzugekommen,
  entfallen,
}: {
  hinzugekommen: string[];
  entfallen: string[];
}) {
  if (!hinzugekommen.length && !entfallen.length) {
    return <span className="text-muted-foreground">Unverändert</span>;
  }
  return (
    <div className="space-y-2">
      {hinzugekommen.length > 0 && (
        <p><span className="font-medium text-foreground">Neu:</span> {hinzugekommen.join(", ")}</p>
      )}
      {entfallen.length > 0 && (
        <p><span className="font-medium text-foreground">Entfallen:</span> {entfallen.join(", ")}</p>
      )}
    </div>
  );
}
