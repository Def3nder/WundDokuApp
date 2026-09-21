"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WundeWiedereroeffnen({ action }: { action: () => Promise<void> }) {
  const [laeuft, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      laedt={laeuft}
      onClick={() => startTransition(async () => { await action(); })}
    >
      <RotateCcw aria-hidden="true" />
      Wunde wieder eröffnen
    </Button>
  );
}
