"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AufnahmeLoeschen({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Diese Aufnahme wirklich löschen? Sie bleibt im Änderungsprotokoll erhalten.")) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        <Trash2 aria-hidden="true" />
        Aufnahme löschen
      </Button>
    </form>
  );
}
