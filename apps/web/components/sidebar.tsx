"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Rol } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { ROL_BADGE } from "@/lib/badge-styles";
import { gradientePorNombre, inicialesDe } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { getActiveHref } from "@/lib/nav-active";
import { navGroups } from "@/components/nav-config";

export interface SidebarProps {
  rol?: Rol;
  /** Contador de productos con stock bajo. Si > 0, se muestra un badge rojo. */
  alertasStockCount?: number;
  /** Info de usuario para el footer del sidebar. */
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────

export function Sidebar({
  rol,
  alertasStockCount = 0,
  userName,
  userEmail,
  userAvatar,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pos-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("pos-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  // Filtrar grupos vacíos tras filtrar adminOnly
  const gruposVisibles = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.adminOnly || rol === "ADMIN"),
    }))
    .filter((g) => g.items.length > 0);

  // Detección de ruta activa con longest-prefix-match para evitar que
  // `/caja` y `/caja/movimientos` se prendan a la vez.
  const allHrefs = gruposVisibles.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = getActiveHref(pathname, allHrefs);

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r bg-sidebar transition-[width] duration-300 ease-out md:flex md:flex-col",
        collapsed ? "w-[76px]" : "w-60",
      )}
      data-collapsed={collapsed ? "true" : "false"}
    >
      {/* Toggle button en el borde derecho */}
      {mounted ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className={cn(
            "group absolute -right-3 top-7 z-20 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-3.5 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
            strokeWidth={2.5}
          />
        </button>
      ) : null}

      {/* ─── Brand / Logo ─── */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border/80",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="POS Chile — Ir al dashboard"
        >
          <span
            aria-hidden
            className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-[#b45309] shadow-md ring-1 ring-primary/30 transition-transform duration-200 group-hover:scale-105"
          >
            <Sparkles className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          {!collapsed ? (
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                POS Chile
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Panel de control
              </span>
            </span>
          ) : null}
        </Link>
      </div>

      {/* ─── Nav ─── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-4",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {gruposVisibles.map((grupo, gi) => (
          <div key={grupo.label} className={gi > 0 ? "mt-5" : ""}>
            {!collapsed ? (
              <h4 className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {grupo.label}
              </h4>
            ) : gi > 0 ? (
              <div className="mx-2 my-2 h-px bg-sidebar-border/60" />
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {grupo.items.map(({ href, label, icon: Icon, badgeCountKey }) => {
                // Active match: longest-prefix winner (calculado arriba).
                // Evita: 1) colisión `/caja` vs `/cajas` (boundary `/` en helper);
                //        2) colisión padre/hijo cuando ambos están en el nav
                //           (p. ej. `/caja` vs `/caja/movimientos`).
                const isActive = href === activeHref;
                const count =
                  badgeCountKey === "alertasStock" ? alertasStockCount : 0;

                const linkNode = (
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
                      collapsed
                        ? "size-11 justify-center"
                        : "gap-3 py-2 pl-4 pr-3",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {/* Pill: fondo + border-left accent */}
                    {isActive ? (
                      <>
                        <motion.span
                          layoutId="sidebar-active-pill"
                          aria-hidden
                          className="absolute inset-0 -z-0 rounded-lg bg-sidebar-accent"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                        {!collapsed ? (
                          <motion.span
                            layoutId="sidebar-active-bar"
                            aria-hidden
                            className="absolute left-0 top-1/2 -z-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                            }}
                          />
                        ) : null}
                      </>
                    ) : null}

                    <Icon
                      className={cn(
                        "relative z-10 size-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {!collapsed ? (
                      <span className="relative z-10 flex-1 truncate">
                        {label}
                      </span>
                    ) : null}

                    {count > 0 ? (
                      <span
                        className={cn(
                          "relative z-10 inline-flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                          "bg-red-500/15 text-red-700 dark:text-red-400",
                          collapsed
                            ? "absolute right-1 top-1 size-4 min-w-0 px-0"
                            : "min-w-[1.25rem] px-1.5",
                        )}
                        aria-label={`${count} productos con stock bajo`}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </Link>
                );

                return (
                  <li key={href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {label}
                          {count > 0 ? (
                            <span className="ml-2 text-muted-foreground">
                              ({count})
                            </span>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      linkNode
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ─── Footer: user card ─── */}
      {userName ? (
        <div
          className={cn(
            "border-t border-sidebar-border/80",
            collapsed ? "p-2" : "p-3",
          )}
        >
          <Link
            href="/perfil"
            className={cn(
              "flex items-center rounded-lg transition-colors hover:bg-sidebar-accent/60",
              collapsed ? "justify-center p-1.5" : "gap-3 p-2",
            )}
            aria-label="Ir a mi perfil"
          >
            <div
              className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
              aria-hidden
            >
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className={cn(
                    "flex size-full items-center justify-center text-xs font-semibold text-white bg-gradient-to-br",
                    gradientePorNombre(userName),
                  )}
                >
                  {inicialesDe(userName)}
                </div>
              )}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">{userName}</p>
                <div className="flex items-center gap-1.5">
                  {rol ? (
                    <Badge
                      variant="outline"
                      className={cn("h-4 px-1.5 text-[9px]", ROL_BADGE[rol])}
                    >
                      {rol}
                    </Badge>
                  ) : null}
                  {userEmail ? (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {userEmail}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
