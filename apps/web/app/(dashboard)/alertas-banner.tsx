"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Banner del dashboard que avisa de productos con stock bajo.
 *
 * Fase 2E patch oportunista (Codex obs post-2C.1): migrado de banner
 * hand-rolled con `border-amber-300 bg-amber-50` hardcoded a
 * `Alert variant="warning"`. Cierra el último residuo del patrón viejo
 * en el dashboard.
 *
 * La animación de entrada/salida (height 0 → auto + opacity) se
 * preserva — es lo que hace el banner sentirse "vivo" cuando aparece
 * tras una venta que dispara una alerta.
 */
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
          <Alert variant="warning">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <AlertTitle>
                  {count === 1
                    ? "1 producto con stock bajo"
                    : `${count} productos con stock bajo`}
                </AlertTitle>
                <AlertDescription>
                  Revisa el inventario y reabastece antes de quedar sin
                  stock.
                </AlertDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/alertas">
                  Ver alertas
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Alert>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
