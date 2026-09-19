"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Check, Cloud, CloudOff } from "lucide-react";
import { Abschnitt, AbschnittsNavigation, type AbschnittDef } from "./abschnitt";
import { AbschnittBefund } from "./abschnitt-befund";
import { AbschnittGroesse } from "./abschnitt-groesse";
import { AbschnittInfektion } from "./abschnitt-infektion";
import { AbschnittSchmerz } from "./abschnitt-schmerz";
import { AbschnittTherapie } from "./abschnitt-therapie";
import { useAutosave } from "./use-autosave";
import { FotoManager } from "@/components/foto/foto-manager";
import { Button } from "@/components/ui/button";
import { FehlerUebersicht } from "@/components/ui/fehler-uebersicht";
import type { AufnahmeWerte } from "@/lib/schema/aufnahme-vorgabe";
import type { FotoAnsicht } from "@/lib/foto-typen";
import type { FormZustand } from "@/actions/patienten";

const START: FormZustand = {};

const ABSCHNITTE = [
  { id: "befund", titel: "Wundbefund", beschreibung: "Umgebung, Rand und Wundgrund" },
  { id: "groesse", titel: "Größe & Exsudation", beschreibung: "Neue Messwerte und Exsudat" },
  { id: "infektion", titel: "Entzündung & Infektion", beschreibung: "Infektzeichen und Abstrich" },
  { id: "schmerz", titel: "Schmerz", beschreibung: "Stärke, Lage und Situationen" },
  { id: "therapie", titel: "Therapieplan", beschreibung: "Versorgung und Kompression" },
  { id: "fotos", titel: "Fotos", beschreibung: "Aufnehmen, beschreiben und sortieren" },
] as const satisfies readonly AbschnittDef[];

const FELDER_PRO_ABSCHNITT: Record<string, readonly string[]> = {
  befund: [
    "datum", "wagnerArmstrongGrad", "dekubitusKategorie", "wundumgebung",
    "wundrand", "wundgrund", "wundgrundSonstigesText",
  ],
  groesse: [
    "breiteMm", "laengeMm", "tiefeMm", "exsudatMenge", "exsudatFarben",
    "exsudatFarbeSonstiges", "exsudatKonsistenz", "geruch",
  ],
  infektion: [
    "entzuendungszeichen", "lokaleInfektzeichen", "systemischeZeichen",
    "infektionSonstiges", "abstrichGenommen", "abstrichErgebnis",
  ],
  schmerz: [
    "schmerzen", "schmerzVas", "schmerzWundeModus", "schmerzWundeUhr",
    "schmerzWundrandModus", "schmerzWundrandUhr", "schmerzWundumgebungModus",
    "schmerzWundumgebungUhr", "schmerzVerbandwechsel", "schmerzVerbandwechselVas",
    "schmerzDruck", "schmerzDruckVas", "schmerzUeberall", "schmerzUeberallVas",
    "schmerztagebuch", "schmerzSonstiges", "wundheilungsfaktoren",
  ],
  therapie: [
    "wundspuelung", "wundspuelungSonstiges", "reinigung", "reinigungSonstiges",
    "hautpflege", "wundrandschutz", "wundfuellung", "wundfuellungGroesseCm",
    "wundfuellungSonstiges", "wundabdeckung", "wundabdeckungGroesseCm",
    "wundabdeckungSonstiges", "fixierung", "fixierungSonstiges", "kompression",
    "kompressionBinde1BreiteCm", "kompressionBinde1Anzahl",
    "kompressionBinde2BreiteCm", "kompressionBinde2Anzahl", "kompressionKlasse",
    "kompressionMass", "therapieSonstiges", "anmerkungen",
  ],
  fotos: [],
};

export function AufnahmeFormular({
  action,
  vorgabe,
  diagnoseTyp,
  abbrechenNach,
  vorherigeFlaeche = null,
  vorherigesDatum = null,
  autosaveWundeId = null,
  initialEntwurfId = null,
  aufnahmeId = null,
  initialFotos = [],
  absendeText = "Aufnahme speichern",
}: {
  action: (zustand: FormZustand, fd: FormData) => Promise<FormZustand>;
  vorgabe: AufnahmeWerte;
  diagnoseTyp: string;
  abbrechenNach: string;
  vorherigeFlaeche?: number | null;
  vorherigesDatum?: string | null;
  autosaveWundeId?: string | null;
  initialEntwurfId?: string | null;
  aufnahmeId?: string | null;
  initialFotos?: FotoAnsicht[];
  absendeText?: string;
}) {
  const [zustand, formAction, laeuft] = useActionState(action, START);
  const formularRef = useRef<HTMLFormElement>(null);
  const autosave = useAutosave({
    formularRef,
    wundeId: autosaveWundeId,
    initialEntwurfId,
  });

  useEffect(() => {
    if (zustand.fehler || zustand.meldung) autosave.fortsetzen();
  }, [autosave, zustand.fehler, zustand.meldung]);

  const fehlerhafte = useMemo(() => {
    const felder = new Set(Object.keys(zustand.fehler ?? {}));
    return new Set(
      ABSCHNITTE.filter((abschnitt) =>
        FELDER_PRO_ABSCHNITT[abschnitt.id].some((feld) => felder.has(feld)),
      ).map((abschnitt) => abschnitt.id),
    );
  }, [zustand.fehler]);

  const f = (feld: string) => zustand.fehler?.[feld];
  const gespeichertUm = autosave.zeitpunkt
    ? new Date(autosave.zeitpunkt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <form ref={formularRef} action={formAction} className="space-y-6" noValidate>
      {autosave.entwurfId && <input type="hidden" name="entwurfId" value={autosave.entwurfId} />}

      <FehlerUebersicht fehler={zustand.fehler} />

      {zustand.meldung && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {zustand.meldung}
        </div>
      )}

      <div className="flex min-h-8 items-center justify-end text-sm text-muted-foreground" aria-live="polite">
        {autosaveWundeId && autosave.status === "speichert" && (
          <span className="inline-flex items-center gap-1.5"><Cloud className="size-4" aria-hidden="true" />Entwurf wird gespeichert …</span>
        )}
        {autosaveWundeId && autosave.status === "gespeichert" && (
          <span className="inline-flex items-center gap-1.5 text-accent"><Check className="size-4" aria-hidden="true" />Entwurf gespeichert{gespeichertUm && ` um ${gespeichertUm}`}</span>
        )}
        {autosaveWundeId && autosave.status === "fehler" && (
          <span className="inline-flex items-center gap-1.5 text-destructive"><CloudOff className="size-4" aria-hidden="true" />Entwurf konnte nicht gespeichert werden</span>
        )}
      </div>

      <AbschnittsNavigation abschnitte={ABSCHNITTE} fehlerhafte={fehlerhafte} />

      <Abschnitt nummer={1} def={ABSCHNITTE[0]} hatFehler={fehlerhafte.has("befund")}>
        <AbschnittBefund werte={vorgabe} diagnoseTyp={diagnoseTyp} fehler={f} />
      </Abschnitt>

      <Abschnitt nummer={2} def={ABSCHNITTE[1]} hatFehler={fehlerhafte.has("groesse")}>
        <AbschnittGroesse
          werte={vorgabe}
          vorherigeFlaeche={vorherigeFlaeche}
          vorherigesDatum={vorherigesDatum}
          fehler={f}
        />
      </Abschnitt>

      <Abschnitt nummer={3} def={ABSCHNITTE[2]} hatFehler={fehlerhafte.has("infektion")}>
        <AbschnittInfektion werte={vorgabe} fehler={f} />
      </Abschnitt>

      <Abschnitt nummer={4} def={ABSCHNITTE[3]} offenVorgabe={false} hatFehler={fehlerhafte.has("schmerz")}>
        <AbschnittSchmerz werte={vorgabe} fehler={f} />
      </Abschnitt>

      <Abschnitt nummer={5} def={ABSCHNITTE[4]} offenVorgabe={false} hatFehler={fehlerhafte.has("therapie")}>
        <AbschnittTherapie werte={vorgabe} fehler={f} />
      </Abschnitt>

      <Abschnitt nummer={6} def={ABSCHNITTE[5]} offenVorgabe={false} hatFehler={false}>
        <FotoManager
          aufnahmeId={aufnahmeId ?? autosave.entwurfId}
          initialFotos={initialFotos}
          entwurfSicherstellen={async () => aufnahmeId ?? autosave.speichernJetzt()}
          onAufnahmeId={(id) => {
            if (!aufnahmeId) autosave.entwurfUebernehmen(id);
          }}
        />
      </Abschnitt>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" laedt={laeuft}>{absendeText}</Button>
        <Button type="button" variant="outline" asChild>
          <Link href={abbrechenNach}>Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
