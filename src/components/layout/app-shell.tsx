import Link from "next/link";
import { Activity, ContactRound, History, LogOut, Settings, Users } from "lucide-react";
import { signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

/**
 * Rahmen aller angemeldeten Seiten.
 *
 * Die Navigation steht auf jeder Seite an derselben Stelle - bei einer App,
 * die zwischen Patienten, Wunden und Formular hin und her springt, ist ein
 * stabiler Anker wichtiger als ein platzsparendes Menue.
 */
export function AppShell({
  benutzer,
  children,
}: {
  benutzer: { name?: string | null; handzeichen: string; rolle: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="WundDoku – Patientenübersicht"
            className="flex items-center gap-2 rounded-lg font-heading text-lg font-semibold text-heading"
          >
            <Activity className="size-6 text-primary" aria-hidden="true" />
            <span className="max-[430px]:hidden">WundDoku</span>
          </Link>

          <nav aria-label="Hauptnavigation" className="ml-2 hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className="tippziel inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
            >
              <Users className="size-5" aria-hidden="true" />
              Patienten
            </Link>
            {benutzer.rolle === "ADMIN" && (
              <>
                <Link
                  href="/einstellungen/benutzer"
                  className="tippziel inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
                >
                  <Settings className="size-5" aria-hidden="true" />
                  Benutzer
                </Link>
                <Link
                  href="/einstellungen/stammdaten"
                  className="tippziel inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
                >
                  <ContactRound className="size-5" aria-hidden="true" />
                  Stammdaten
                </Link>
                <Link
                  href="/einstellungen/audit-log"
                  className="tippziel inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
                >
                  <History className="size-5" aria-hidden="true" />
                  Protokoll
                </Link>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <MobileNavigation istAdmin={benutzer.rolle === "ADMIN"} />
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium leading-tight">{benutzer.name}</p>
              <p className="text-xs text-muted-foreground">Handzeichen {benutzer.handzeichen}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden" title="Abmelden">
                <LogOut aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main
        id="hauptinhalt"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        WundDoku · Patientendaten verbleiben auf diesem Rechner
      </footer>
    </div>
  );
}
