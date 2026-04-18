"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export function AlertasEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-6 py-14 text-center dark:border-emerald-900 dark:bg-emerald-950/20"
    >
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      >
        <ShieldCheck className="size-8" />
      </motion.div>
      <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
        Todo bajo control
      </h3>
      <p className="max-w-sm text-sm text-emerald-800/80 dark:text-emerald-200/80">
        No hay productos con stock bajo. El inventario está sano y por encima
        del umbral configurado.
      </p>
    </motion.div>
  );
}
