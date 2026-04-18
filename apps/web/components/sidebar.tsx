"use client";

import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type Rol = "ADMIN" | "CAJERO" | "VENDEDOR";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Si está definido, muestra un badge con el conteo (solo si > 0). */
  badgeCountKey?: "alertasStock";
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categorias", label: "Categorías", icon: FolderTree },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw },
  { href: "/caja", label: "Caja", icon: CreditCard },
  {
    href: "/alertas",
    label: "Alertas",
    icon: AlertTriangle,
    badgeCountKey: "alertasStock",
  },
  { href: "/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/perfil", label: "Mi Perfil", icon: UserCircle },
  { href: "/docs", label: "API Docs", icon: Code2, adminOnly: true },
];

export interface SidebarProps {
  rol?: Rol;
  /** Contador de productos con stock bajo. Si > 0, se muestra un badge rojo. */
  alertasStockCount?: number;
}

export function Sidebar({ rol, alertasStockCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems.filter((i) => !i.adminOnly || rol === "ADMIN");

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="text-lg font-bold">
          POS Chile
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon, badgeCountKey }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count =
            badgeCountKey === "alertasStock" ? alertasStockCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Pill animada que se desliza al item activo */}
              {isActive ? (
                <motion.span
                  layoutId="sidebar-active"
                  aria-hidden
                  className="absolute inset-0 -z-0 rounded-md bg-sidebar-primary"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                />
              ) : null}

              <span className="relative z-10 flex items-center gap-3">
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
              </span>

              {count > 0 ? (
                <span
                  className={cn(
                    "relative z-10 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-sidebar-primary-foreground text-sidebar-primary"
                      : "bg-destructive text-destructive-foreground",
                  )}
                  aria-label={`${count} productos con stock bajo`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
