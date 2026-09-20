import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PfadEintrag = { label: string; href?: string };

export function Breadcrumb({ eintraege }: { eintraege: PfadEintrag[] }) {
  return (
    <nav aria-label="Pfadnavigation">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold text-foreground">
        {eintraege.map((eintrag, index) => (
          <li key={`${eintrag.label}-${index}`} className="flex min-w-0 items-center gap-2">
            <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {eintrag.href ? (
              <Link href={eintrag.href} className="truncate hover:text-primary">{eintrag.label}</Link>
            ) : (
              <span className="truncate" aria-current="page">{eintrag.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
