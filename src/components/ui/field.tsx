import * as React from "react";
import { AlertCircle } from "lucide-react";
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
    <div className={cn("space-y-1.5", className)}>
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
  "w-full rounded-lg border bg-input px-3 py-2.5 text-base text-foreground transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-destructive";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  // min-h-11 = 44px Tippziel, 16px Schrift verhindert das Auto-Zoom von iOS.
  <input
    ref={ref}
    className={cn(basis, "min-h-11 border-border-strong", className)}
    {...props}
  />
));
Input.displayName = "Input";

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
  // Bewusst das native <select>: auf dem Tablet oeffnet es die
  // Systemauswahl, die sich mit einer Hand bedienen laesst.
  <select
    ref={ref}
    className={cn(basis, "min-h-11 border-border-strong cursor-pointer", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
