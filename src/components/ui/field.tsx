import * as React from "react";
import { AlertCircle, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Rahmen um ein Eingabefeld: sichtbares Label, dauerhafter Hilfetext,
 * Fehlermeldung direkt unter dem Feld.
 *
 * Die Verknuepfung ueber aria-describedby passiert hier zentral, damit sie
 * nicht an einzelnen Feldern vergessen wird.
 */
export function Field({
  id,
  label,
  pflicht,
  hilfe,
  fehler,
  className,
  children,
}: {
  id: string;
  label: string;
  pflicht?: boolean;
  hilfe?: string;
  fehler?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => React.ReactNode;
}) {
  const hilfeId = hilfe ? `${id}-hilfe` : undefined;
  const fehlerId = fehler ? `${id}-fehler` : undefined;
  const describedBy = [hilfeId, fehlerId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id} pflicht={pflicht}>
        {label}
      </Label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": fehler ? true : undefined,
      })}

      {hilfe && (
        <p id={hilfeId} className="text-sm text-muted-foreground">
          {hilfe}
        </p>
      )}

      {fehler && (
        <p
          id={fehlerId}
          role="alert"
          className="flex items-start gap-1.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {fehler}
        </p>
      )}
    </div>
  );
}

const basis =
  "min-w-0 w-full max-w-full rounded-lg border bg-input px-3 py-2 text-base leading-6 text-foreground transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-destructive";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  if (type === "number") {
    return <Zahlenfeld ref={ref} className={className} {...props} />;
  }
  if (type === "date") {
    return (
      <span className="datumsrahmen">
        <input ref={ref} type="date" className={cn(basis, "datumsfeld border-border-strong", className)} {...props} />
      </span>
    );
  }
  return (
    // min-h-11 = 44px Tippziel, 16px Schrift verhindert das Auto-Zoom von iOS.
    <input
      ref={ref}
      type={type}
      className={cn(basis, "h-11 border-border-strong", className)}
      {...props}
    />
  );
});
Input.displayName = "Input";

/**
 * Zahlenfeld mit eigenen Stepper-Knoepfen statt der winzigen, browsereigenen
 * Spinbox-Pfeile. `stepUp()`/`stepDown()` respektieren `min`/`max`/`step` des
 * nativen Elements selbst - hier wird nur die Bedienung nachgebildet.
 *
 * Die Knoepfe stehen links/rechts ueber die volle Feldhoehe (min-h-11 = 44px)
 * statt uebereinander gestapelt - gestapelt waere jeder Knopf nur ~18px hoch
 * und risse damit die von axe geprueften 24x24px-Mindestgroesse (SC 2.5.8).
 *
 * Bewusst per `tabIndex={-1}` aus der Tab-Reihenfolge ausgenommen: Auf-/Ab-
 * Pfeiltasten aendern den Wert im fokussierten Feld bereits nativ, ganz ohne
 * sichtbare Spinbox (gleiches Muster wie der "Suche leeren"-Knopf in
 * stammdaten-suche.tsx).
 */
const Zahlenfeld = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, forwardedRef) => {
  const innenRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(forwardedRef, () => innenRef.current as HTMLInputElement);

  function schritt(richtung: 1 | -1) {
    const feld = innenRef.current;
    if (!feld) return;
    richtung === 1 ? feld.stepUp() : feld.stepDown();
    feld.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        type="button"
        tabIndex={-1}
        disabled={props.disabled || props.readOnly}
        aria-label="Wert verringern"
        onClick={() => schritt(-1)}
        className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        ref={innenRef}
        type="number"
        className={cn(
          basis,
          "zahlenfeld-ohne-spinner h-11 w-full border-border-strong px-11 text-center",
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={props.disabled || props.readOnly}
        aria-label="Wert erhöhen"
        onClick={() => schritt(1)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
});
Zahlenfeld.displayName = "Zahlenfeld";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(basis, "border-border-strong resize-y", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  // Bewusst das native <select>: auf dem Tablet oeffnet es weiterhin die
  // Systemauswahl, die sich mit einer Hand bedienen laesst - appearance-none
  // ersetzt hier nur den geschlossenen Pfeil, nicht das Aufklappverhalten.
  <div className={cn("relative min-w-0", className)}>
    <select
      ref={ref}
      className={cn(
        basis,
        "h-11 w-full appearance-none border-border-strong cursor-pointer pr-10",
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
  </div>
));
Select.displayName = "Select";
