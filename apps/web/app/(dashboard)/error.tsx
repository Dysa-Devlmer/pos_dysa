"use client";

/**
 * Error boundary del segmento (dashboard) — Fase 2C bloque C.
 *
 * Cuando una page del dashboard falla, este boundary se renderiza DENTRO
 * del layout (sidebar + header siguen visibles), a diferencia del
 * `app/error.tsx` global que reemplaza toda la UI.
 *
 * UX: el cajero/admin no pierde su contexto de navegación; reintenta o
 * vuelve al dashboard sin tener que re-loguearse ni reabrir el menú.
 *
 * Reporta a Sentry sin bloquear el render. PII scrubbing pasa por
 * sentry.client.config.ts (beforeSend).
 */

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6"
      role="alert"
    >
      <Alert variant="destructive">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <div className="flex-1 space-y-1">
            <AlertTitle>Algo salió mal en esta sección</AlertTitle>
            <AlertDescription>
              Ocurrió un error al cargar este módulo. El equipo ya fue
              notificado. Puedes reintentar o volver al inicio del
              dashboard sin perder tu sesión.
            </AlertDescription>
            {error.digest ? (
              <p className="pt-1 font-mono text-[11px] text-muted-foreground">
                ref: {error.digest}
              </p>
            ) : null}
          </div>
        </div>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => reset()}>
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="size-4" />
            Volver al dashboard
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
