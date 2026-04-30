"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";

import type { Rol } from "@repo/db";
import { navGroups } from "@/components/nav-config";
import { cn } from "@/lib/utils";
import { getActiveHref } from "@/lib/nav-active";

export interface MobileNavProps {
  rol?: Rol;
  alertasStockCount?: number;
}

export function MobileNav({ rol, alertasStockCount = 0 }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar drawer al navegar (cambio de ruta)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const gruposVisibles = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.adminOnly || rol === "ADMIN"),
    }))
    .filter((g) => g.items.length > 0);

  const allHrefs = gruposVisibles.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = getActiveHref(pathname, allHrefs);

  return (
    <>
      {/* Trigger — hamburger (mobile only) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        className="inline-flex size-10 items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted md:hidden"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>

      {/* Drawer — portal a body para escapar stacking contexts (header backdrop-blur) */}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  {/* Backdrop */}
                  <motion.div
                    key="mobile-nav-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
                    aria-hidden
                  />

                  {/* Panel */}
                  <motion.aside
                    key="mobile-nav-panel"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", stiffness: 360, damping: 34 }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menú de navegación"
                    style={{ backgroundColor: "var(--card)", height: "100dvh" }}
                    className="fixed left-0 top-0 z-[101] flex w-[82%] max-w-[300px] flex-col border-r shadow-2xl md:hidden"
                  >
              {/* Header del drawer */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border/80 px-4">
                <Link
                  href="/"
                  className="flex items-center gap-2.5"
                  aria-label="DyPos CL — Ir al dashboard"
                >
                  <span
                    aria-hidden
                    className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-[#b45309] shadow-md ring-1 ring-primary/30"
                  >
                    <Sparkles
                      className="size-4 text-primary-foreground"
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[15px] font-semibold tracking-tight text-foreground">
                      DyPos CL
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Panel de control
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Nav */}
              <nav
                className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                {gruposVisibles.map((grupo, gi) => (
                  <div key={grupo.label} className={gi > 0 ? "mt-5" : ""}>
                    <h4 className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {grupo.label}
                    </h4>
                    <ul className="flex flex-col gap-0.5">
                      {grupo.items.map(
                        ({ href, label, icon: Icon, badgeCountKey }) => {
                          // Longest-prefix-match (lib/nav-active.ts) — evita
                          // tanto la colisión `/caja` vs `/cajas` como la
                          // colisión padre/hijo `/caja` vs `/caja/movimientos`.
                          const isActive = href === activeHref;
                          const count =
                            badgeCountKey === "alertasStock"
                              ? alertasStockCount
                              : 0;
                          return (
                            <li key={href}>
                              <Link
                                href={href}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm font-medium transition-colors",
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "size-4 shrink-0",
                                    isActive
                                      ? "text-primary"
                                      : "text-muted-foreground",
                                  )}
                                />
                                <span className="flex-1 truncate">{label}</span>
                                {count > 0 ? (
                                  <span
                                    className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold tabular-nums text-red-700 dark:text-red-400"
                                    aria-label={`${count} productos con stock bajo`}
                                  >
                                    {count > 99 ? "99+" : count}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                ))}
              </nav>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
