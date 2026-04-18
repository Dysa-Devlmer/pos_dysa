"use client";

import { motion } from "framer-motion";

export function HeaderActions({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
      className="flex items-center gap-2"
    >
      {children}
    </motion.div>
  );
}
