"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--muted)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/3 -z-10 size-96 rounded-full bg-primary/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center"
      >
        {/* 404 illustration — number + magnifier */}
        <motion.div
          initial={{ scale: 0.9, rotate: -3, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <svg viewBox="0 0 260 160" className="h-40 w-auto text-muted-foreground">
            <defs>
              <linearGradient id="nf-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <ellipse
              cx="130"
              cy="142"
              rx="80"
              ry="7"
              fill="currentColor"
              fillOpacity="0.08"
            />
            <text
              x="130"
              y="112"
              textAnchor="middle"
              fontSize="110"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              fill="url(#nf-grad)"
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            >
              404
            </text>
            {/* magnifier over the zero */}
            <circle
              cx="134"
              cy="72"
              r="22"
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.8"
              strokeWidth="3"
            />
            <path
              d="M150 88 L168 106"
              stroke="var(--primary)"
              strokeOpacity="0.8"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Página no encontrada
          </h1>
          <p className="text-balance text-sm text-muted-foreground sm:text-base">
            La página que buscas fue movida, eliminada o nunca existió. Revisa la
            URL o vuelve al inicio.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 size-4" />
              Volver al inicio
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/productos">
              <Search className="mr-2 size-4" />
              Buscar productos
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Volver
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
