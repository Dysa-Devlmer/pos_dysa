"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type Modo = "light" | "dark" | "system";

const ICONS: Record<Modo, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Modo, string> = {
  light: "Tema claro",
  dark: "Tema oscuro",
  system: "Tema del sistema",
};

function siguiente(modo: Modo): Modo {
  // Cicla: system → light → dark → system
  if (modo === "system") return "light";
  if (modo === "light") return "dark";
  return "system";
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de hidratar, renderizamos un placeholder neutro para evitar mismatch
  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Cambiar tema"
        disabled
        className="opacity-50"
      >
        <Monitor className="size-4" />
      </Button>
    );
  }

  const actual = ((theme ?? "system") as Modo);
  const Icon = ICONS[actual] ?? Monitor;
  const label = LABELS[actual] ?? "Tema";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(siguiente(actual))}
      aria-label={`${label}. Cambiar al siguiente modo.`}
      title={label}
      className="relative overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={actual}
          initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-flex"
          aria-hidden
        >
          <Icon className="size-4" />
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{label}</span>
    </Button>
  );
}
