"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Scrollea al tope del documento en cada cambio de ruta.
 * Se monta una única vez en el layout del dashboard.
 * Usa behavior "instant" para evitar conflictos con animaciones de entrada
 * de página (template.tsx).
 */
export function ScrollToTop() {
  const pathname = usePathname();
  React.useEffect(() => {
    // Next.js 15 conserva el scroll por default en client-side navigation.
    // Este efecto fuerza scrollTop = 0 en cada pathname nuevo.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);
  return null;
}
