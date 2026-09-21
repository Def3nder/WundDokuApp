import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AufnahmeLoeschen } from "@/components/formular/aufnahme-loeschen";
import { FotoGalerie } from "@/components/foto/foto-galerie";
import { aufnahmeLoeschen } from "@/actions/aufnahmen";
import { flaecheMm2, formatiereMm2 } from "@/lib/wundmasse";
import { datum } from "@/lib/wundtext";
import { leseAuswahl } from "@/lib/utils";
import {
  AUFNAHME_TYPEN,
  DEKUBITUS_KATEGORIEN,
  ENTZUENDUNGSZEICHEN,
  EXSUDAT_FARBEN,
  EXSUDAT_KONSISTENZ,
  EXSUDAT_MENGEN,
  FIXIERUNG,
  KOMPRESSION,
  KOMPRESSIONSKLASSEN,
  LOKALE_INFEKTZEICHEN,
  REINIGUNG,
  SCHMERZ_ORT_MODI,
  WAGNER_GRADE,
  WUNDABDECKUNG,
  WUNDFUELLUNG,
  WUNDGRUND,
  WUNDRAND,
  WUNDSPUELUNG,
  WUNDUMGEBUNG,
  labelVon,
  labelsVon,
} from "@/lib/enums";
import { fotoZuAnsicht } from "@/lib/foto-typen";

function Angabe({ label, children }: { label: string; children?: ReactNode }) {
  const leer = children == null || children === "";
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-medium">{leer ? "–" : children}</dd>
    </div>
  );
}

function DetailKarte({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>{titel}</CardTitle></CardHeader>
      <CardContent><dl className="detail-grid gap-x-8 gap-y-5">{children}</dl></CardContent>
    </Card>
  );
}

const jaNein = (wert: boolean) => (wert ? "Ja" : "Nein");
const nummer = (wert: number | null, einheit = "") =>
  wert == null ? "" : `${new Intl.NumberFormat("de-DE").format(wert)}${einheit}`;
const liste = (optionen: readonly { wert: string; label: string }[], json: string) =>
  labelsVon(optionen, leseAuswahl(json)).join(" · ");
const schmerzOrt = (modus: string | null, uhr: number | null) =>
  modus === "UHR" && uhr ? `Auf ${uhr} Uhr` : labelVon(SCHMERZ_ORT_MODI, modus);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await db.assessment.findUnique({ where: { id }, select: { datum: true } });
  return { title: a ? `Aufnahme ${datum(a.datum)}` : "Aufnahme" };
}

export default async function AufnahmeSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aufnahme = await db.assessment.findUnique({
    where: { id },
    include: {
      wunde: { include: { patient: true } },
      erstelltVon: { select: { name: true, handzeichen: true } },
      fotos: {
        where: { geloeschtAm: null },
        orderBy: [{ reihenfolge: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (
    !aufnahme ||
    aufnahme.geloeschtAm ||
    aufnahme.wunde.geloeschtAm ||
    aufnahme.wunde.patient.geloeschtAm
  ) notFound();

  const loeschAction = aufnahmeLoeschen.bind(null, id);
  const kompressionTeile = [
    aufnahme.kompressionBinde1BreiteCm != null || aufnahme.kompressionBinde1Anzahl != null
      ? `Binde 1: ${nummer(aufnahme.kompressionBinde1BreiteCm, " cm") || "–"}, ${aufnahme.kompressionBinde1Anzahl ?? "–"} Stück`
      : "",
    aufnahme.kompressionBinde2BreiteCm != null || aufnahme.kompressionBinde2Anzahl != null
      ? `Binde 2: ${nummer(aufnahme.kompressionBinde2BreiteCm, " cm") || "–"}, ${aufnahme.kompressionBinde2Anzahl ?? "–"} Stück`
      : "",
    labelVon(KOMPRESSIONSKLASSEN, aufnahme.kompressionKlasse),
    aufnahme.kompressionMass,
  ].filter(Boolean).join(" · ");

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Breadcrumb eintraege={[
          { label: "Patienten", href: "/" },
          { label: `${aufnahme.wunde.patient.nachname}, ${aufnahme.wunde.patient.vorname}`, href: `/patienten/${aufnahme.wunde.patientId}` },
          { label: aufnahme.wunde.bezeichnung, href: `/wunden/${aufnahme.woundId}` },
        ]} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Aufnahme vom {datum(aufnahme.datum)}</h1>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {labelVon(AUFNAHME_TYPEN, aufnahme.typ)}
          </span>
          {aufnahme.istEntwurf && (
            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">Entwurf</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {aufnahme.wunde.patient.nachname}, {aufnahme.wunde.patient.vorname}
          {aufnahme.erstelltVon && ` · dokumentiert von ${aufnahme.erstelltVon.name} (${aufnahme.erstelltVon.handzeichen})`}
        </p>
      </div>

      <div className="form-actions">
        <Button asChild>
          <Link href={`/aufnahmen/${id}/bearbeiten`}><Pencil aria-hidden="true" />{aufnahme.istEntwurf ? "Entwurf fortsetzen" : "Aufnahme bearbeiten"}</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/aufnahmen/${id}/pdf`}><FileDown aria-hidden="true" />Als PDF</a>
        </Button>
        <AufnahmeLoeschen action={loeschAction} />
      </div>

      <DetailKarte titel="Wundbefund">
        <Angabe label="Wagner-/Armstrong-Grad">{labelVon(WAGNER_GRADE, aufnahme.wagnerArmstrongGrad)}</Angabe>
        <Angabe label="Dekubitus-Kategorie">{labelVon(DEKUBITUS_KATEGORIEN, aufnahme.dekubitusKategorie)}</Angabe>
        <Angabe label="Wundumgebung">{liste(WUNDUMGEBUNG, aufnahme.wundumgebung)}</Angabe>
        <Angabe label="Wundrand">{liste(WUNDRAND, aufnahme.wundrand)}</Angabe>
        <Angabe label="Wundgrund">{liste(WUNDGRUND, aufnahme.wundgrund)}</Angabe>
        <Angabe label="Sonstiger Wundgrund">{aufnahme.wundgrundSonstigesText}</Angabe>
      </DetailKarte>

      <DetailKarte titel="Wundgröße & Exsudation">
        <Angabe label="Breite">{nummer(aufnahme.breiteMm, " mm")}</Angabe>
        <Angabe label="Länge">{nummer(aufnahme.laengeMm, " mm")}</Angabe>
        <Angabe label="Tiefe">{nummer(aufnahme.tiefeMm, " mm")}</Angabe>
        <Angabe label="Fläche">{formatiereMm2(flaecheMm2(aufnahme))}</Angabe>
        <Angabe label="Exsudatmenge">{labelVon(EXSUDAT_MENGEN, aufnahme.exsudatMenge)}</Angabe>
        <Angabe label="Exsudatfarbe">{liste(EXSUDAT_FARBEN, aufnahme.exsudatFarben)}</Angabe>
        <Angabe label="Sonstige Farbe">{aufnahme.exsudatFarbeSonstiges}</Angabe>
        <Angabe label="Konsistenz">{liste(EXSUDAT_KONSISTENZ, aufnahme.exsudatKonsistenz)}</Angabe>
        <Angabe label="Geruch">{jaNein(aufnahme.geruch)}</Angabe>
      </DetailKarte>

      <DetailKarte titel="Entzündung & Infektion">
        <Angabe label="Entzündungszeichen">{liste(ENTZUENDUNGSZEICHEN, aufnahme.entzuendungszeichen)}</Angabe>
        <Angabe label="Lokale Infektzeichen">{liste(LOKALE_INFEKTZEICHEN, aufnahme.lokaleInfektzeichen)}</Angabe>
        <Angabe label="Systemische Zeichen">{jaNein(aufnahme.systemischeZeichen)}</Angabe>
        <Angabe label="Weitere Beobachtungen">{aufnahme.infektionSonstiges}</Angabe>
        <Angabe label="Abstrich genommen">{jaNein(aufnahme.abstrichGenommen)}</Angabe>
        <Angabe label="Abstrichergebnis">{aufnahme.abstrichErgebnis}</Angabe>
      </DetailKarte>

      <DetailKarte titel="Schmerz & Heilungsfaktoren">
        <Angabe label="Schmerzen">{jaNein(aufnahme.schmerzen)}</Angabe>
        <Angabe label="Aktuelle Stärke">{aufnahme.schmerzen && aufnahme.schmerzVas != null ? `VAS/NRS ${aufnahme.schmerzVas}/10` : ""}</Angabe>
        <Angabe label="In der Wunde">{schmerzOrt(aufnahme.schmerzWundeModus, aufnahme.schmerzWundeUhr)}</Angabe>
        <Angabe label="Am Wundrand">{schmerzOrt(aufnahme.schmerzWundrandModus, aufnahme.schmerzWundrandUhr)}</Angabe>
        <Angabe label="Wundumgebung">{schmerzOrt(aufnahme.schmerzWundumgebungModus, aufnahme.schmerzWundumgebungUhr)}</Angabe>
        <Angabe label="Beim Verbandwechsel">{aufnahme.schmerzVerbandwechsel ? `Ja${aufnahme.schmerzVerbandwechselVas != null ? ` · VAS ${aufnahme.schmerzVerbandwechselVas}/10` : ""}` : "Nein"}</Angabe>
        <Angabe label="Bei Druck">{aufnahme.schmerzDruck ? `Ja${aufnahme.schmerzDruckVas != null ? ` · VAS ${aufnahme.schmerzDruckVas}/10` : ""}` : "Nein"}</Angabe>
        <Angabe label="Überall im Wundbereich">{aufnahme.schmerzUeberall ? `Ja${aufnahme.schmerzUeberallVas != null ? ` · VAS ${aufnahme.schmerzUeberallVas}/10` : ""}` : "Nein"}</Angabe>
        <Angabe label="Schmerztagebuch">{jaNein(aufnahme.schmerztagebuch)}</Angabe>
        <Angabe label="Weitere Schmerzangaben">{aufnahme.schmerzSonstiges}</Angabe>
        <Angabe label="Wundheilungsfaktoren">{aufnahme.wundheilungsfaktoren}</Angabe>
      </DetailKarte>

      <DetailKarte titel="Therapieplan">
        <Angabe label="Wundspülung">{[liste(WUNDSPUELUNG, aufnahme.wundspuelung), aufnahme.wundspuelungSonstiges].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Reinigung">{[liste(REINIGUNG, aufnahme.reinigung), aufnahme.reinigungSonstiges].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Hautpflege">{aufnahme.hautpflege}</Angabe>
        <Angabe label="Wundrandschutz">{aufnahme.wundrandschutz}</Angabe>
        <Angabe label="Wundfüllung">{[liste(WUNDFUELLUNG, aufnahme.wundfuellung), nummer(aufnahme.wundfuellungGroesseCm, " cm"), aufnahme.wundfuellungSonstiges].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Wundabdeckung">{[liste(WUNDABDECKUNG, aufnahme.wundabdeckung), nummer(aufnahme.wundabdeckungGroesseCm, " cm"), aufnahme.wundabdeckungSonstiges].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Fixierung">{[liste(FIXIERUNG, aufnahme.fixierung), aufnahme.fixierungSonstiges].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Kompression">{[liste(KOMPRESSION, aufnahme.kompression), kompressionTeile].filter(Boolean).join(" · ")}</Angabe>
        <Angabe label="Weitere Therapieangaben">{aufnahme.therapieSonstiges}</Angabe>
        <Angabe label="Allgemeine Anmerkungen">{aufnahme.anmerkungen}</Angabe>
      </DetailKarte>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Fotos</CardTitle></CardHeader>
        <CardContent>
          {aufnahme.fotos.length > 0 ? (
            <FotoGalerie fotos={aufnahme.fotos.map(fotoZuAnsicht)} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Noch keine Fotos zu dieser Aufnahme.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
