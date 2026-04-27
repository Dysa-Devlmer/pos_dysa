import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { prisma, type Prisma } from "@repo/db";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/utils";

import { FiltrosMovimientos, type TipoMovOpt } from "./filtros";
import {
  MovimientosTable,
  type MovimientoRow,
} from "./movimientos-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Movimientos de caja" };

const TIPOS_VALID = ["INGRESO", "EGRESO", "RETIRO", "AJUSTE"] as const;
const MAX_ROWS = 1000;

function parseFecha(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInt1(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseTipos(v: string | undefined): TipoMovOpt[] {
  if (!v) return [];
  const parts = v
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => (TIPOS_VALID as readonly string[]).includes(s));
  return Array.from(new Set(parts)) as TipoMovOpt[];
}

export default async function MovimientosCajaPage({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    tipo?: string;
    cajaId?: string;
    usuarioId?: string;
    aperturaId?: string;
    q?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = session.user.rol === "ADMIN";
  const meId = Number(session.user.id);

  const sp = await searchParams;
  const desde = parseFecha(sp.desde);
  const hasta = parseFecha(sp.hasta);
  const tipos = parseTipos(sp.tipo);
  const cajaIdRaw = parseInt1(sp.cajaId);
  const usuarioIdRaw = parseInt1(sp.usuarioId);
  const aperturaId = parseInt1(sp.aperturaId);
  const q = sp.q?.trim() ?? "";

  // Permisos:
  //   - ADMIN ve todo (puede filtrar por cajaId / usuarioId)
  //   - CAJERO solo ve movs cuya apertura.usuarioId === self (forzado).
  //     Cualquier ?usuarioId distinto en query lo ignoramos silenciosamente.
  const cajaId = isAdmin ? cajaIdRaw : null;
  const usuarioIdFiltro = isAdmin ? usuarioIdRaw : meId;

  // ─── WHERE clause ────────────────────────────────────────────────
  const where: Prisma.MovimientoCajaWhereInput = {};

  if (desde || hasta) {
    where.fecha = {};
    if (desde) (where.fecha as { gte?: Date }).gte = desde;
    if (hasta) {
      const fin = new Date(hasta);
      fin.setHours(23, 59, 59, 999);
      (where.fecha as { lte?: Date }).lte = fin;
    }
  }

  if (tipos.length > 0) {
    where.tipo = { in: tipos };
  }

  if (q) {
    where.motivo = { contains: q, mode: "insensitive" };
  }

  if (aperturaId) {
    where.aperturaId = aperturaId;
  }

  // Filtros sobre la apertura asociada (caja + usuario del turno)
  const aperturaFilter: Prisma.AperturaCajaWhereInput = {};
  if (cajaId) aperturaFilter.cajaId = cajaId;
  if (usuarioIdFiltro) aperturaFilter.usuarioId = usuarioIdFiltro;
  if (Object.keys(aperturaFilter).length > 0) {
    where.apertura = aperturaFilter;
  }

  // ─── Queries: rows + opciones de filtro (admin) ──────────────────
  const [movs, cajas, usuarios] = await Promise.all([
    prisma.movimientoCaja.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: MAX_ROWS,
      include: {
        usuario: { select: { id: true, nombre: true } },
        apertura: {
          select: {
            id: true,
            estado: true,
            caja: { select: { id: true, nombre: true, ubicacion: true } },
          },
        },
      },
    }),
    isAdmin
      ? prisma.caja.findMany({
          orderBy: [{ activa: "desc" }, { nombre: "asc" }],
          select: { id: true, nombre: true },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.usuario.findMany({
          where: { activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        })
      : Promise.resolve([]),
  ]);

  const rows: MovimientoRow[] = movs.map((m) => ({
    id: m.id,
    fechaISO: m.fecha.toISOString(),
    tipo: m.tipo,
    monto: m.monto,
    motivo: m.motivo,
    cajeroNombre: m.usuario.nombre,
    cajaNombre: m.apertura.caja.nombre,
    cajaUbicacion: m.apertura.caja.ubicacion,
    aperturaId: m.apertura.id,
    aperturaEstado: m.apertura.estado,
  }));

  // ─── Agregaciones (sobre el set filtrado en BD, no sólo lo cargado) ──
  // Si rows.length === MAX_ROWS, las cards muestran el total real igual.
  const grupos = await prisma.movimientoCaja.groupBy({
    by: ["tipo"],
    where,
    _sum: { monto: true },
    _count: { _all: true },
  });

  const totalIngresos =
    grupos.find((g) => g.tipo === "INGRESO")?._sum.monto ?? 0;
  const totalEgresos = grupos.find((g) => g.tipo === "EGRESO")?._sum.monto ?? 0;
  const totalRetiros = grupos.find((g) => g.tipo === "RETIRO")?._sum.monto ?? 0;
  const totalAjuste = grupos.find((g) => g.tipo === "AJUSTE")?._sum.monto ?? 0; // signed
  const totalCount = grupos.reduce((a, g) => a + g._count._all, 0);

  // Neto sobre la caja: +ingresos -egresos -retiros + ajuste(signed)
  const neto = totalIngresos - totalEgresos - totalRetiros + totalAjuste;

  const hasFiltro =
    Boolean(
      desde || hasta || cajaId || usuarioIdRaw || aperturaId || q,
    ) || tipos.length > 0;

  const truncado = movs.length === MAX_ROWS && totalCount > MAX_ROWS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Movimientos de caja
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Auditoría completa de ingresos, egresos, retiros y ajustes en todas las cajas."
              : "Tus movimientos de caja: ingresos, egresos, retiros y ajustes registrados durante tus turnos."}
          </p>
        </div>
        <Button asChild>
          <Link href="/caja/movimientos/nuevo">
            <Plus className="size-4" />
            Nuevo movimiento
          </Link>
        </Button>
      </div>

      <FiltrosMovimientos
        desde={sp.desde ?? null}
        hasta={sp.hasta ?? null}
        tipos={tipos}
        cajaId={cajaId}
        usuarioId={usuarioIdRaw}
        aperturaId={aperturaId}
        q={q || null}
        cajas={cajas}
        usuarios={usuarios}
        isAdmin={isAdmin}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Movimientos"
          value={String(totalCount)}
          tone="muted"
        />
        <StatCard
          label="Ingresos"
          value={`+${formatCLP(totalIngresos)}`}
          tone="success"
        />
        <StatCard
          label="Egresos"
          value={`−${formatCLP(totalEgresos)}`}
          tone="destructive"
        />
        <StatCard
          label="Retiros"
          value={`−${formatCLP(totalRetiros)}`}
          tone="warning"
        />
        <StatCard
          label="Neto sobre caja"
          value={`${neto >= 0 ? "+" : "−"}${formatCLP(Math.abs(neto))}`}
          tone={neto >= 0 ? "success" : "destructive"}
          hint={
            totalAjuste !== 0
              ? `incluye ajuste ${
                  totalAjuste >= 0 ? "+" : "−"
                }${formatCLP(Math.abs(totalAjuste))}`
              : undefined
          }
        />
      </div>

      {truncado ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            Se muestran los <strong>últimos {MAX_ROWS}</strong> movimientos del
            filtro actual ({totalCount} en total). Refina el rango de fechas
            para ver lotes anteriores. Las tarjetas de totales sí reflejan el{" "}
            <strong>total real</strong>.
          </div>
        </div>
      ) : null}

      <MovimientosTable data={rows} hasFiltro={hasFiltro} />
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────

type Tone = "muted" | "success" | "destructive" | "warning" | "info";

const TONE_CLS: Record<Tone, string> = {
  muted: "text-foreground",
  success: "text-emerald-700 dark:text-emerald-400",
  destructive: "text-red-700 dark:text-red-400",
  warning: "text-orange-700 dark:text-orange-400",
  info: "text-blue-700 dark:text-blue-400",
};

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${TONE_CLS[tone]}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
