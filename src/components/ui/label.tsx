"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { pflicht?: boolean }
>(({ className, children, pflicht, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("block text-sm font-medium text-foreground", className)}
    {...props}
  >
    {children}
    {pflicht && (
      <>
        <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
        <span className="nur-screenreader"> (Pflichtfeld)</span>
      </>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
