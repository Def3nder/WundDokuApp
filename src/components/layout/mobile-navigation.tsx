"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ContactRound, History, Menu, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const linkKlasse =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground outline-none data-[highlighted]:bg-surface-muted";

export function MobileNavigation({ istAdmin }: { istAdmin: boolean }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="xl:hidden"
          aria-label="Hauptnavigation öffnen"
        >
          <Menu aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-xl"
        >
          <DropdownMenu.Item asChild>
            <Link href="/" className={linkKlasse}>
              <Users className="size-5 text-muted-foreground" aria-hidden="true" />
              Patienten
            </Link>
          </DropdownMenu.Item>
          {istAdmin && (
            <>
              <DropdownMenu.Item asChild>
                <Link href="/einstellungen/benutzer" className={linkKlasse}>
                  <Settings className="size-5 text-muted-foreground" aria-hidden="true" />
                  Benutzer
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/einstellungen/stammdaten" className={linkKlasse}>
                  <ContactRound className="size-5 text-muted-foreground" aria-hidden="true" />
                  Stammdaten
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/einstellungen/audit-log" className={linkKlasse}>
                  <History className="size-5 text-muted-foreground" aria-hidden="true" />
                  Protokoll
                </Link>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
