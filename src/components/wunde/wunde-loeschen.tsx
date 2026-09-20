"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WundeLoeschen({
  action,
  bezeichnung,
}: {
  action: () => Promise<void>;
  bezeichnung: string;
}) {
  const [laeuft, startTransition] = useTransition();

  function loeschen() {
    const bestaetigt = window.confirm(
      `Wunde „${bezeichnung}“ wirklich löschen? Sie wird mit allen Aufnahmen und Fotos aus der aktiven Dokumentation ausgeblendet. Die Daten bleiben zur Wiederherstellung erhalten.`,
    );
    if (!bestaetigt) return;

    startTransition(async () => {
      await action();
    });
  }

  return (
    <Button type="button" variant="destructive" onClick={loeschen} laedt={laeuft}>
      <Trash2 aria-hidden="true" />
      Wunde löschen
    </Button>
  );
}
