"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type Rol = "ADMIN" | "CAJERO" | "VENDEDOR";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categorias", label: "Categorías", icon: FolderTree },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/caja", label: "Caja", icon: CreditCard },
  { href: "/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/perfil", label: "Mi Perfil", icon: UserCircle },
  { href: "/docs", label: "API Docs", icon: Code2, adminOnly: true },
];

export function Sidebar({ rol }: { rol?: Rol }) {
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
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
