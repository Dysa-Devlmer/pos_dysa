"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight } from "lucide-react";

export interface AlertasBannerProps {
  count: number;
}

export function AlertasBanner({ count }: AlertasBannerProps) {
  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: 0.05,
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
              >
                <AlertTriangle className="size-5" />
              </motion.div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {count === 1
                    ? "1 producto con stock bajo"
                    : `${count} productos con stock bajo`}
                </p>
                <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-200/80">
                  Revisa el inventario y reabastece antes de quedar sin stock.
                </p>
              </div>
            </div>
            <Link
              href="/alertas"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-amber-200 dark:text-amber-900 dark:hover:bg-amber-200/90"
            >
              Ver alertas
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
