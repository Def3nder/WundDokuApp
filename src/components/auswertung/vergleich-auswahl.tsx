"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
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
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="vergleich-ausgang">Ausgangsaufnahme</label>
            <Select
              id="vergleich-ausgang"
              value={ausgangId}
              onChange={(ereignis) => wechseln("a", ereignis.target.value)}
              disabled={laedt}
            >
              {optionen.map((option) => (
                <option key={option.id} value={option.id} disabled={option.id === vergleichId}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

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

          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="vergleich-ziel">Vergleichsaufnahme</label>
            <Select
              id="vergleich-ziel"
              value={vergleichId}
              onChange={(ereignis) => wechseln("b", ereignis.target.value)}
              disabled={laedt}
            >
              {optionen.map((option) => (
                <option key={option.id} value={option.id} disabled={option.id === ausgangId}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
