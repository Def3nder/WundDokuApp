import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmeldung" };

export default async function LoginSeite({
  searchParams,
}: {
  searchParams: Promise<{ weiter?: string }>;
}) {
  const sitzung = await auth();
  if (sitzung?.user) redirect("/");

  const { weiter } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <main id="hauptinhalt" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Activity className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />
            <h1 className="font-heading text-2xl font-semibold">WundDoku</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Digitale Wunddokumentation
            </p>
          </div>

          <LoginForm weiter={weiter} />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Zugang nur für berechtigtes Personal. Jede Anmeldung wird protokolliert.
          </p>
        </div>
      </main>
    </div>
  );
}
