import { prisma } from "@repo/db";
import { DashboardResponseSchema } from "@repo/api-client/types";
import { requireAuth, requireRateLimit, jsonOk } from "../_helpers";

/**
 * GET /api/v1/dashboard — datos del dashboard para el mobile (M3).
 *
 * Responde con:
 * - ventasHoy: total CLP + transacciones del día (zona Chile)
 * - stockCritico: count + top 5 productos con stock <= alertaStock
 * - ventas7dias: serie para el chart, últimos 7 días incluyendo hoy
 *
 * Sin rol-gating — cajero/vendedor/admin necesitan ver su panel.
 * Auth vía Bearer (mobile) o cookie (web), igual que el resto de /api/v1/*.
 *
 * Shape validado contra DashboardResponseSchema (zod) antes de responder —
 * mismo patrón defensivo que /auth/login para catch de drifts entre el
 * handler y el contract en packages/api-client.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHILE_TZ = "America/Santiago";
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function ahoraChile(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: CHILE_TZ }));
}

function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function claveDiaChile(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function etiquetaDia(dLocal: Date): string {
  return `${DIAS_CORTOS[dLocal.getDay()]} ${String(dLocal.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth(request);
  if (error) return error;

  const nowChile = ahoraChile();
  const hoy = inicioDelDia(nowChile);
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 6);

  const [ventasHoyAgg, stockCriticoCount, stockCriticoTop, ventas7diasRows] =
    await Promise.all([
      prisma.venta.aggregate({
        where: { fecha: { gte: hoy } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.$queryRaw<Array<{ c: bigint }>>`
        SELECT COUNT(*)::bigint AS c
        FROM productos
        WHERE activo = true AND stock <= alerta_stock
      `,
      prisma.producto.findMany({
        where: {
          activo: true,
          stock: { lte: prisma.producto.fields.alertaStock },
        },
        orderBy: [{ stock: "asc" }, { nombre: "asc" }],
        take: 5,
        select: { id: true, nombre: true, stock: true, alertaStock: true },
      }),
      prisma.venta.findMany({
        where: { fecha: { gte: hace7 } },
        select: { fecha: true, total: true },
        orderBy: { fecha: "asc" },
      }),
    ]);

  // Construir 7 buckets contiguos (clave zona Chile) y rellenar con ceros
  const bucket = new Map<string, { total: number; transacciones: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(hace7);
    d.setDate(d.getDate() + i);
    bucket.set(claveDiaChile(d), { total: 0, transacciones: 0 });
  }
  for (const v of ventas7diasRows) {
    const b = bucket.get(claveDiaChile(v.fecha));
    if (b) {
      b.total += v.total;
      b.transacciones += 1;
    }
  }

  const ventas7dias = Array.from(bucket.entries()).map(([fecha, v]) => {
    const [yStr, mStr, dStr] = fecha.split("-");
    const dLocal = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    return {
      fecha,
      etiqueta: etiquetaDia(dLocal),
      total: v.total,
      transacciones: v.transacciones,
    };
  });

  const payload = {
    ventasHoy: {
      total: ventasHoyAgg._sum.total ?? 0,
      transacciones: ventasHoyAgg._count._all,
    },
    stockCritico: {
      count: Number(stockCriticoCount[0]?.c ?? 0n),
      productos: stockCriticoTop,
    },
    ventas7dias,
  };

  // Validación runtime defensiva — detecta drifts contrato/handler en dev
  const validated = DashboardResponseSchema.parse({ data: payload });
  return jsonOk(validated.data);
}
