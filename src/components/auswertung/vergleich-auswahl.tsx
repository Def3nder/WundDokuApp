"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type VergleichOption = {
  id: string;
  label: string;
};

export function VergleichAuswahl({
  woundId,
  optionen,
  ausgangId,
  vergleichId,
}: {
  woundId: string;
  optionen: VergleichOption[];
  ausgangId: string;
  vergleichId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [laedt, startTransition] = useTransition();

  function wechseln(name: "a" | "b", wert: string) {
    const parameter = new URLSearchParams(searchParams.toString());
    parameter.set(name, wert);
    startTransition(() => {
      router.replace(`/wunden/${woundId}/vergleich?${parameter.toString()}`, { scroll: false });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vergleichszeitpunkte</CardTitle>
        <CardDescription>
          Links steht der Ausgangsbefund, rechts die spätere oder gewünschte Vergleichsaufnahme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <label className="space-y-1.5 text-sm font-medium">
            <span>Ausgangsaufnahme</span>
            <select
              value={ausgangId}
              onChange={(ereignis) => wechseln("a", ereignis.target.value)}
              disabled={laedt}
              className="tippziel w-full rounded-lg border border-border-strong bg-input px-3 py-2 text-base text-foreground shadow-sm disabled:opacity-60"
            >
              {optionen.map((option) => (
                <option key={option.id} value={option.id} disabled={option.id === vergleichId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="justify-self-center"
            onClick={() => {
              const parameter = new URLSearchParams(searchParams.toString());
              parameter.set("a", vergleichId);
              parameter.set("b", ausgangId);
              startTransition(() => {
                router.replace(`/wunden/${woundId}/vergleich?${parameter.toString()}`, {
                  scroll: false,
                });
              });
            }}
            disabled={laedt}
            aria-label="Ausgangs- und Vergleichsaufnahme tauschen"
          >
            {laedt ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowLeftRight aria-hidden="true" />}
          </Button>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Vergleichsaufnahme</span>
            <select
              value={vergleichId}
              onChange={(ereignis) => wechseln("b", ereignis.target.value)}
              disabled={laedt}
              className="tippziel w-full rounded-lg border border-border-strong bg-input px-3 py-2 text-base text-foreground shadow-sm disabled:opacity-60"
            >
              {optionen.map((option) => (
                <option key={option.id} value={option.id} disabled={option.id === ausgangId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
