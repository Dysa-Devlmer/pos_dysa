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
  Wallet,
  ArrowLeftRight,
  Smartphone,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Si está definido, muestra un badge con el conteo (solo si > 0). */
  badgeCountKey?: "alertasStock";
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/caja", label: "Caja", icon: CreditCard },
      {
        href: "/caja/movimientos",
        label: "Movimientos",
        icon: ArrowLeftRight,
      },
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      // Patch RBAC Fase 3D.4 — Devoluciones ADMIN-only.
      // Server (`devoluciones/actions.ts` + `/api/v1/devoluciones`)
      // también lo enforza; el flag acá solo oculta el item del sidebar.
      {
        href: "/devoluciones",
        label: "Devoluciones",
        icon: RotateCcw,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      // Patch RBAC Fase 3D.4 — Categorías y Productos ADMIN-only.
      // Server-side: `categorias/actions.ts` + `productos/actions.ts`.
      {
        href: "/categorias",
        label: "Categorías",
        icon: FolderTree,
        adminOnly: true,
      },
      {
        href: "/productos",
        label: "Productos",
        icon: Package,
        adminOnly: true,
      },
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
      { href: "/cajas", label: "Cajas", icon: Wallet, adminOnly: true },
      {
        href: "/mobile-releases",
        label: "Mobile APK",
        icon: Smartphone,
        adminOnly: true,
      },
      { href: "/docs", label: "API Docs", icon: Code2, adminOnly: true },
    ],
  },
];
