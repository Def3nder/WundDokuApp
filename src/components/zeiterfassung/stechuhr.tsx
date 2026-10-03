"use client";

import { Clock3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ZeitVorgabe } from "@/lib/arbeitszeit";
import { laufendeAnsicht, type BuchungAnsicht } from "@/lib/arbeitszeit-offline";
import { BuchungKnopf, BuchungLoeschen, LaufendeZeit } from "./buchung";
import { useOfflineZeit } from "./offline-kontext";

/**
 * Stechuhr mit Serverstand und allem, was auf diesem Geraet schon ein- oder
 * ausgestempelt, aber noch nicht uebertragen ist.
 */
export function Stechuhr({ laufend, serverJetzt, vorgabe }: { laufend?: BuchungAnsicht; serverJetzt: string; vorgabe: ZeitVorgabe }) {
  const offline = useOfflineZeit();
  const { eintrag, clientId, lokal, stoppWartet } = offline ? laufendeAnsicht(laufend, offline.eintraege) : { eintrag: laufend, clientId: undefined, lokal: false, stoppWartet: false };
  const schluessel = `${eintrag?.id ?? "start"}-${eintrag?.version ?? 0}-${clientId ?? ""}`;
  return <Card className="overflow-hidden border-l-4 border-l-primary">
    <CardContent className="flex flex-col justify-between gap-5 py-6 sm:flex-row sm:items-center">
      {eintrag ? <LaufendeZeit beginn={eintrag.beginn} serverJetzt={lokal ? new Date().toISOString() : serverJetzt} /> : <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" />Stechuhr</p>
        <h2 className="text-2xl font-semibold">{stoppWartet ? "Ausgestempelt" : "Bereit für den Arbeitstag"}</h2>
        <p className="text-sm text-muted-foreground">{stoppWartet
          ? "Das Ausstempeln ist auf diesem Gerät gespeichert und wird übertragen, sobald der Server erreichbar ist."
          : "Aktuell nicht eingestempelt. Datum und Uhrzeit lassen sich vor dem Speichern anpassen."}</p>
      </div>}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {eintrag && <BuchungKnopf key={`${schluessel}-edit`} eintrag={eintrag} modus="edit" vorgabe={vorgabe} clientId={clientId} />}
        <BuchungKnopf key={schluessel} eintrag={eintrag} modus={eintrag ? "stop" : "start"} vorgabe={vorgabe} clientId={clientId} />
        {eintrag && (lokal && clientId && offline
          ? <Button type="button" variant="ghost" size="icon" aria-label="Eingestempelte Zeit auf diesem Gerät verwerfen" title="Verwerfen" onClick={() => void offline.verwerfen(clientId)}><Trash2 aria-hidden="true" /></Button>
          : <BuchungLoeschen eintrag={eintrag} />)}
      </div>
    </CardContent>
  </Card>;
}
