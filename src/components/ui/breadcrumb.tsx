import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PfadEintrag = { label: string; href?: string };

export function Breadcrumb({ eintraege }: { eintraege: PfadEintrag[] }) {
  return (
    <nav aria-label="Pfadnavigation">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-medium text-foreground">
        {eintraege.map((eintrag, index) => (
          <li key={`${eintrag.label}-${index}`} className="flex min-w-0 max-w-full items-center gap-2">
            <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {eintrag.href ? (
              <Link href={eintrag.href} className="min-h-11 min-w-0 content-center truncate hover:text-primary" title={eintrag.label}>{eintrag.label}</Link>
            ) : (
              <span className="truncate" aria-current="page">{eintrag.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
