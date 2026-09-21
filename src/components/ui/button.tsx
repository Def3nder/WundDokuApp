import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // min-h-11 = 44px: Tippziel-Mindestmass fuer die Bedienung am Tablet.
  "inline-flex min-h-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg text-base leading-6 font-medium transition-colors duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "bg-secondary text-on-secondary hover:brightness-95",
        outline: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        destructive: "bg-destructive text-on-destructive hover:brightness-110",
        link: "text-primary underline-offset-4 hover:underline min-h-0",
      },
      size: {
        md: "px-4 py-2",
        sm: "min-h-11 px-3 py-2 text-sm",
        lg: "min-h-12 px-6 py-3 text-lg",
        icon: "size-11 shrink-0 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Sperrt den Button und zeigt einen Spinner - gegen Doppelabsenden. */
  laedt?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, laedt = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || laedt}
        aria-busy={laedt || undefined}
        {...props}
      >
        {laedt ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
