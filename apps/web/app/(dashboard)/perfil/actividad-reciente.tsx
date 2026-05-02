/**
 * Fase 3C.2 — Actividad reciente real basada en AuditLog.
 *
 * Antes (Fase 9): solo mostraba ventas del usuario, lo que dejaba en
 * blanco a admins que no venden y omitía cambios de catálogo,
 * devoluciones, imports CSV, ediciones, etc.
 *
 * Ahora: lee `AuditLog` filtrado por `usuarioId`. Cubre TODO lo que el
 * sistema audita hoy:
 *   - Ventas (CREATE/UPDATE/DELETE/RESTORE en `ventas/actions.ts`).
 *   - Devoluciones (CREATE en `devoluciones/actions.ts`).
 *   - Imports CSV (CREATE bulk en `productos/import-actions.ts`).
 *
 * Cuando se sume audit de productos individuales, clientes,
 * categorías, perfil, etc., aparecen automáticamente sin tocar este
 * componente.
 */

import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  PackagePlus,
  Pencil,
  Receipt,
  RotateCcw,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";
import type { AuditAccion } from "@repo/db";
import { prisma } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACTIVITY_LIMIT = 15;

function formatFechaHora(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type AuditEntry = {
  id: number;
  tabla: string;
  registroId: number;
  accion: AuditAccion;
  fecha: Date;
  diff: unknown;
};

type Resolved = {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  detail: string | null;
  href: string | null;
  badge: string;
};

function isCsvImport(diff: unknown): diff is { action: string; filename?: string; created?: number; updated?: number } {
  return (
    typeof diff === "object" &&
    diff !== null &&
    "action" in diff &&
    (diff as { action: unknown }).action === "PRODUCTOS_IMPORT_CSV"
  );
}

function resolveEntry(e: AuditEntry): Resolved {
  // Casos especiales por contenido del diff antes de caer al genérico.
  if (e.tabla === "productos" && isCsvImport(e.diff)) {
    const c = e.diff.created ?? 0;
    const u = e.diff.updated ?? 0;
    return {
      icon: Upload,
      label: "Importó productos por CSV",
      detail: `${c} creados · ${u} actualizados`,
      href: "/productos",
      badge: "Import",
    };
  }

  switch (e.tabla) {
    case "ventas":
      switch (e.accion) {
        case "CREATE":
          return {
            icon: Receipt,
            label: "Registró una venta",
            detail: `Venta #${e.registroId}`,
            href: e.registroId > 0 ? `/ventas/${e.registroId}` : null,
            badge: "Venta",
          };
        case "UPDATE":
          return {
            icon: Pencil,
            label: "Editó una venta",
            detail: `Venta #${e.registroId}`,
            href: e.registroId > 0 ? `/ventas/${e.registroId}` : null,
            badge: "Venta",
          };
        case "DELETE":
          return {
            icon: Trash2,
            label: "Eliminó una venta",
            detail: `Venta #${e.registroId}`,
            href: "/ventas/eliminadas",
            badge: "Venta",
          };
        case "RESTORE":
          return {
            icon: RotateCcw,
            label: "Restauró una venta",
            detail: `Venta #${e.registroId}`,
            href: e.registroId > 0 ? `/ventas/${e.registroId}` : null,
            badge: "Venta",
          };
      }
      break;
    case "devoluciones":
      return {
        icon: RotateCcw,
        label: e.accion === "CREATE" ? "Registró una devolución" : "Cambió una devolución",
        detail: `Devolución #${e.registroId}`,
        href: "/devoluciones",
        badge: "Devolución",
      };
    case "productos":
      return {
        icon: e.accion === "DELETE" ? Trash2 : PackagePlus,
        label: accionLabel(e.accion, "el producto"),
        detail: `Producto #${e.registroId}`,
        href: "/productos",
        badge: "Producto",
      };
    case "clientes":
      return {
        icon: e.accion === "DELETE" ? Trash2 : Pencil,
        label: accionLabel(e.accion, "el cliente"),
        detail: null,
        href: "/clientes",
        badge: "Cliente",
      };
    case "usuarios":
      return {
        icon: Pencil,
        label: accionLabel(e.accion, "un usuario"),
        detail: null,
        href: "/usuarios",
        badge: "Usuario",
      };
    case "categorias":
      return {
        icon: Pencil,
        label: accionLabel(e.accion, "una categoría"),
        detail: null,
        href: "/categorias",
        badge: "Categoría",
      };
  }

  // Fallback genérico: tabla desconocida o combinación no mapeada.
  return {
    icon: ScrollText,
    label: `${prettyAccion(e.accion)} en ${e.tabla}`,
    detail: `Registro #${e.registroId}`,
    href: null,
    badge: e.tabla,
  };
}

function accionLabel(a: AuditAccion, sujeto: string): string {
  switch (a) {
    case "CREATE":
      return `Creó ${sujeto}`;
    case "UPDATE":
      return `Editó ${sujeto}`;
    case "DELETE":
      return `Eliminó ${sujeto}`;
    case "RESTORE":
      return `Restauró ${sujeto}`;
  }
}

function prettyAccion(a: AuditAccion): string {
  switch (a) {
    case "CREATE":
      return "Creación";
    case "UPDATE":
      return "Edición";
    case "DELETE":
      return "Eliminación";
    case "RESTORE":
      return "Restauración";
  }
}

export async function ActividadReciente({ usuarioId }: { usuarioId: number }) {
  const entries = await prisma.auditLog.findMany({
    where: { usuarioId },
    orderBy: { fecha: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      id: true,
      tabla: true,
      registroId: true,
      accion: true,
      fecha: true,
      diff: true,
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4" />
          Mi actividad reciente
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/ventas">
            Ver ventas
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <Inbox className="size-8 opacity-40" />
            <p>Aún no hay actividad registrada en tu cuenta.</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/caja">Ir al POS</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {entries.map((raw) => {
              const e = raw as AuditEntry;
              const r = resolveEntry(e);
              const Icon = r.icon;
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 py-3"
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    {r.href ? (
                      <Link
                        href={r.href}
                        className="block text-sm font-medium hover:underline"
                      >
                        {r.label}
                      </Link>
                    ) : (
                      <span className="block text-sm font-medium">
                        {r.label}
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFechaHora(e.fecha)}
                      {r.detail ? (
                        <>
                          <span className="mx-1.5">·</span>
                          {r.detail}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {r.badge}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
