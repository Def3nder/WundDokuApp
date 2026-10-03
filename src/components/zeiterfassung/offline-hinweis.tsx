"use client";

import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { zeitText, type ZeitVorgabe } from "@/lib/arbeitszeit";
import { ansichtAus, type WarteEintrag } from "@/lib/arbeitszeit-offline";
import { BuchungKnopf } from "./buchung";
import { useOfflineZeit } from "./offline-kontext";

function WarteZeile({ eintrag, vorgabe }: { eintrag: WarteEintrag; vorgabe: ZeitVorgabe }) {
  const offline = useOfflineZeit()!;
  const ansicht = ansichtAus(eintrag);
  const pruefen = eintrag.status === "pruefen";
  const beschreibung = ansicht
    ? `${zeitText(new Date(ansicht.beginn))} – ${ansicht.ende ? zeitText(new Date(ansicht.ende)) : "laufend"}`
    : "Ungültige Zeitangabe";
  return <li className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-medium">{beschreibung}</p>
      <p className="text-sm text-muted-foreground">
        {ansicht && `${ansicht.pauseMinuten} Min. Pause · `}{eintrag.werte.id ? "Änderung an einer vorhandenen Buchung" : "Neue Buchung"}
      </p>
      {pruefen
        ? <p className="break-words text-sm font-medium text-destructive">Zu prüfen: {eintrag.meldung}</p>
        : <p className="text-sm text-muted-foreground">Wartet auf Übertragung</p>}
    </div>
    {pruefen && <div className="flex shrink-0 flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void offline.erneutSenden(eintrag.clientId)}><RefreshCw aria-hidden="true" />Erneut senden</Button>
      {ansicht && !eintrag.werte.id && <BuchungKnopf eintrag={ansicht} modus="edit" vorgabe={vorgabe} clientId={eintrag.clientId} />}
      <Button type="button" variant="ghost" size="icon" aria-label={`Buchung verwerfen: ${beschreibung}`} title="Verwerfen" onClick={() => void offline.verwerfen(eintrag.clientId)}><Trash2 aria-hidden="true" /></Button>
    </div>}
  </li>;
}

/** Zeigt, ob die Verbindung fehlt und was auf diesem Geraet noch auf die Uebertragung wartet. */
export function OfflineHinweis({ vorgabe }: { vorgabe: ZeitVorgabe }) {
  const offline = useOfflineZeit();
  if (!offline) return null;
  const { eintraege, online, sendeProblem, sendet, senden } = offline;
  if (online && eintraege.length === 0 && !sendeProblem) return null;
  const wartend = eintraege.filter((e) => e.status === "wartet").length;
  return <div className="space-y-3" role="status" aria-live="polite">
    {!online && <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4 text-sm">
      <CloudOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p><span className="font-medium">Keine Verbindung zum Server.</span> Ein- und Ausstempeln sowie Nachträge werden auf diesem Gerät gespeichert und automatisch übertragen, sobald wieder eine Verbindung besteht. Die Auswertung zeigt bis dahin nur den zuletzt geladenen Stand.</p>
    </div>}
    {online && sendeProblem && wartend > 0 && <div className="rounded-lg border border-destructive bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">Die Übertragung war nicht möglich.</p>
      <p className="mt-1 text-muted-foreground">Die Einträge bleiben auf diesem Gerät erhalten. Möglicherweise ist der Server gerade nicht erreichbar oder die Anmeldung ist abgelaufen – dann bitte erneut anmelden.</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" laedt={sendet} onClick={() => void senden()}><RefreshCw aria-hidden="true" />Jetzt senden</Button>
    </div>}
    {eintraege.length > 0 && <Card><CardContent className="py-3">
      <h2 className="text-base font-semibold">Noch nicht übertragen <span className="text-muted-foreground">({eintraege.length})</span></h2>
      <ul className="divide-y divide-border">{eintraege.map((e) => <WarteZeile key={e.clientId} eintrag={e} vorgabe={vorgabe} />)}</ul>
    </CardContent></Card>}
  </div>;
}
