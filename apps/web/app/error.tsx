"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No usamos captureExceptionSafe aquí porque sentry-helpers importa
    // lib/privacy.ts con node:crypto → rompe el client bundle (ver gotcha 90).
    // El scrubbing PII sucede en sentry.client.config.ts::beforeSend
    // (user.email/ip + headers cookie/authorization). Para errores del client
    // boundary, error.message rara vez tiene PII (Next framework errors).
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--destructive)_0%,transparent_70%)] opacity-[0.07]" />
      <div className="pointer-events-none absolute -right-32 top-1/4 -z-10 size-96 rounded-full bg-destructive/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center"
      >
        {/* Error illustration — warning triangle with gears */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <svg viewBox="0 0 200 160" className="h-40 w-auto text-muted-foreground">
            <defs>
              <linearGradient id="err-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--destructive)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="142" rx="70" ry="6" fill="currentColor" fillOpacity="0.08" />
            {/* warning triangle */}
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
              d="M100 28 L170 132 L30 132 Z"
              fill="url(#err-grad)"
              stroke="var(--destructive)"
              strokeOpacity="0.75"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <motion.line
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.35, delay: 1.05 }}
              style={{ transformOrigin: "100px 70px" }}
              x1="100"
              y1="62"
              x2="100"
              y2="100"
              stroke="var(--destructive)"
              strokeOpacity="0.9"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, delay: 1.35 }}
              style={{ transformOrigin: "100px 116px" }}
              cx="100"
              cy="116"
              r="3.5"
              fill="var(--destructive)"
              fillOpacity="0.9"
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3" />
            Error inesperado
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Algo salió mal
          </h1>
          <p className="text-balance text-sm text-muted-foreground sm:text-base">
            Ocurrió un error al procesar tu solicitud. El equipo ya fue notificado
            — puedes reintentar o volver al inicio.
          </p>
          {error.digest ? (
            <p className="pt-2 font-mono text-[11px] text-muted-foreground/70">
              ref: {error.digest}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="mr-2 size-4" />
            Reintentar
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">
              <Home className="mr-2 size-4" />
              Volver al inicio
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
