import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeader — Fase 2C UX polish.
 *
 * Server Component puro (sin "use client"). Patrón unificado para todas
 * las rutas operativas del dashboard:
 *   - h1 sobrio: `text-2xl font-bold tracking-tight`
 *   - subtítulo opcional: `text-sm text-muted-foreground`
 *   - slot `action` para CTA principal a la derecha (botón "Nueva venta",
 *     "Movimiento", etc.). Se mueve abajo en mobile cuando el header
 *     no entra en una sola fila.
 *
 * NO se usa en `/` (dashboard) — esa ruta mantiene su header "premium"
 * con `font-display` + sections tagged. Las rutas operativas lo usan
 * para que el conjunto se sienta consistente y profesional.
 *
 * Política de iconos en h1: NO por defecto. Si un caso amerita color/
 * tono especial (ej. devoluciones amber), usar el slot `action` o
 * añadir un Badge bajo el subtítulo — NO meter `<Icon />` adentro del h1.
 */

export interface PageHeaderProps {
  title: React.ReactNode;
  /** 1-2 líneas máximo, contexto operativo (no marketing). */
  subtitle?: React.ReactNode;
  /** CTA principal — típicamente `<Button>` o `<Link>` envuelto en Button. */
  action?: React.ReactNode;
  /** Contenido extra debajo del subtítulo (ej. badges de estado). */
  meta?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta ? <div className="pt-1">{meta}</div> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      ) : null}
    </header>
  );
}
