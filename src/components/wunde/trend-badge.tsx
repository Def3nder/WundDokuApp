import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatiereProzent, type Trend } from "@/lib/wundmasse";

/**
 * Zeigt die Veraenderung der Wundflaeche gegenueber der Voraufnahme.
 *
 * Bei einer Wunde ist "kleiner" die gute Richtung - deshalb ist der
 * fallende Pfeil gruen. Farbe steht nie allein: Pfeil und Wert sagen dasselbe.
 */
export function TrendBadge({ trend, className }: { trend: Trend; className?: string }) {
  const darstellung = {
    verkleinert: {
      Icon: TrendingDown,
      klasse: "bg-status-gut/15 text-status-gut",
      text: "kleiner als zuvor",
    },
    vergroessert: {
      Icon: TrendingUp,
      klasse: "bg-status-schlecht/15 text-status-schlecht",
      text: "größer als zuvor",
    },
    unveraendert: {
      Icon: Minus,
      klasse: "bg-status-neutral/15 text-status-neutral",
      text: "unverändert",
    },
  }[trend.richtung];

  const { Icon } = darstellung;

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        darstellung.klasse,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatiereProzent(trend.prozent)}
      <span className="nur-screenreader">Wundfläche {darstellung.text}</span>
    </span>
  );
}
