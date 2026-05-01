import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Alert — Fase 2C UX polish.
 *
 * Reemplaza banners hand-rolled que tenían colores hardcoded (ej.
 * `border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30`)
 * por un componente con variants tipadas que respeta tokens del design
 * system y dark mode automático.
 *
 * Variantes:
 *   - default     → tono neutro (informativo).
 *   - warning     → ámbar (aviso accionable, ej. "no hay categorías").
 *   - destructive → rojo (error o bloqueo).
 *   - success     → verde (confirmación).
 *
 * Server Component puro. Composable con AlertTitle, AlertDescription,
 * y un slot opcional para `<Button>` CTA.
 */

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        warning:
          "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 [&_button]:focus-visible:ring-amber-400",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive [&_button]:focus-visible:ring-destructive",
        success:
          "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mt-1 text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
