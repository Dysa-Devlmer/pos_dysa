"use server";

import { prisma } from "@repo/db";
import { auth } from "@/auth";

// ──────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────

export interface AlertaProductoRow {
  id: number;
  nombre: string;
  codigoBarras: string;
  categoriaId: number;
  categoriaNombre: string;
  stock: number;
  alertaStock: number;
  sinStock: boolean;
  precio: number;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Productos con stock ≤ alertaStock (ordenados por stock ASC)
//    Nota: Prisma no permite comparar dos columnas del mismo registro
//    directamente en `where` sin fieldReference; usamos $queryRaw con
//    template literal (parametrizado) que Postgres resuelve eficientemente
//    con índice en stock.
// ──────────────────────────────────────────────────────────────────────────

export async function obtenerProductosConAlertaStock(): Promise<
  AlertaProductoRow[]
> {
  await requireSession();

  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      nombre: string;
      codigo_barras: string;
      precio: number;
      stock: number;
      alerta_stock: number;
      categoria_id: number;
      categoria_nombre: string;
    }>
  >`
    SELECT
      p.id,
      p.nombre,
      p.codigo_barras,
      p.precio,
      p.stock,
      p.alerta_stock,
      p.categoria_id,
      c.nombre AS categoria_nombre
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE p.activo = true
      AND p.stock <= p.alerta_stock
    ORDER BY p.stock ASC, p.nombre ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    codigoBarras: r.codigo_barras,
    categoriaId: r.categoria_id,
    categoriaNombre: r.categoria_nombre,
    stock: r.stock,
    alertaStock: r.alerta_stock,
    sinStock: r.stock <= 0,
    precio: r.precio,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Conteo rápido para el badge del sidebar
// ──────────────────────────────────────────────────────────────────────────

export async function contarAlertasStock(): Promise<number> {
  await requireSession();

  const result = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c
    FROM productos
    WHERE activo = true
      AND stock <= alerta_stock
  `;
  const c = result[0]?.c ?? 0n;
  return Number(c);
}
