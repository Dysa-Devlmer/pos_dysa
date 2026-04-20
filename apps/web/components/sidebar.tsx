"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderTree,
  Package,
  Users,
  UserCog,
  ShoppingCart,
  CreditCard,
  FileBarChart,
  UserCircle,
  Code2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Rol } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { ROL_BADGE } from "@/lib/badge-styles";
import { gradientePorNombre, inicialesDe } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Si está definido, muestra un badge con el conteo (solo si > 0). */
  badgeCountKey?: "alertasStock";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/caja", label: "Caja", icon: CreditCard },
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/categorias", label: "Categorías", icon: FolderTree },
      { href: "/productos", label: "Productos", icon: Package },
      { href: "/clientes", label: "Clientes", icon: Users },
      {
        href: "/alertas",
        label: "Alertas",
        icon: AlertTriangle,
        badgeCountKey: "alertasStock",
      },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "/reportes", label: "Reportes", icon: FileBarChart },
      { href: "/perfil", label: "Mi Perfil", icon: UserCircle },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
      { href: "/docs", label: "API Docs", icon: Code2, adminOnly: true },
    ],
  },
];

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

  // Filtrar grupos vacíos tras filtrar adminOnly
  const gruposVisibles = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.adminOnly || rol === "ADMIN"),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      {/* ─── Brand / Logo ─── */}
      <div className="flex h-16 items-center border-b border-sidebar-border/80 px-5">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="POS Chile — Ir al dashboard"
        >
          <span
            aria-hidden
            className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 via-primary to-primary/70 shadow-sm ring-1 ring-primary/20 transition-transform duration-200 group-hover:scale-105"
          >
            <Sparkles className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-[15px] font-semibold tracking-tight text-transparent">
              POS Chile
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Panel de control
            </span>
          </span>
        </Link>
      </div>

      {/* ─── Nav ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {gruposVisibles.map((grupo, gi) => (
          <div key={grupo.label} className={gi > 0 ? "mt-5" : ""}>
            <h4 className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {grupo.label}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {grupo.items.map(({ href, label, icon: Icon, badgeCountKey }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                const count =
                  badgeCountKey === "alertasStock" ? alertasStockCount : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
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
                      <span className="relative z-10 flex-1 truncate">{label}</span>

                      {count > 0 ? (
                        <span
                          className={cn(
                            "relative z-10 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                            "bg-red-500/15 text-red-700 dark:text-red-400",
                          )}
                          aria-label={`${count} productos con stock bajo`}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ─── Footer: user card ─── */}
      {userName ? (
        <div className="border-t border-sidebar-border/80 p-3">
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/60"
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
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
