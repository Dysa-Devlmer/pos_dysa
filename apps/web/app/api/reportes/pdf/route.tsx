import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@repo/db";
import { auth } from "@/auth";
import {
  CHILE_TZ,
  parseRangoDesdeURL,
} from "@/lib/reportes-fecha";

import {
  ReporteDocument,
  type ReporteResumen,
  type ReporteVentaRow,
} from "./document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtFechaCL(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");
}

function fmtSoloFechaCL(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function ymdToDMY(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let rango;
  try {
    rango = parseRangoDesdeURL(new URL(request.url));
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Parámetros de fecha inválidos",
      },
      { status: 400 },
    );
  }

  const { desdeYMD, hastaYMD, desde, hasta } = rango;

  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "desc" },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      usuario: { select: { nombre: true } },
    },
  });

  const rows: ReporteVentaRow[] = ventas.map((v) => {
    const pct = Number(v.descuentoPct);
    const pctAmount = Math.round(v.subtotal * (pct / 100));
    const descuentoTotal = pctAmount + v.descuentoMonto;
    return {
      numeroBoleta: v.numeroBoleta,
      fechaFmt: fmtFechaCL(v.fecha),
      clienteNombre: v.cliente?.nombre ?? "—",
      metodoPago: v.metodoPago,
      vendedor: v.usuario.nombre,
      subtotal: v.subtotal,
      descuentoTotal,
      impuesto: v.impuesto,
      total: v.total,
    };
  });

  // Agregados
  const totalCLP = rows.reduce((a, r) => a + r.total, 0);
  const totalVentas = rows.length;
  const ticketPromedio =
    totalVentas > 0 ? Math.round(totalCLP / totalVentas) : 0;

  const metodosMap = new Map<string, { cantidad: number; total: number }>();
  for (const r of rows) {
    const m = metodosMap.get(r.metodoPago) ?? { cantidad: 0, total: 0 };
    m.cantidad += 1;
    m.total += r.total;
    metodosMap.set(r.metodoPago, m);
  }
  const porMetodo = [...metodosMap.entries()]
    .map(([metodo, v]) => ({ metodo, ...v }))
    .sort((a, b) => b.total - a.total);

  const resumen: ReporteResumen = {
    totalVentas,
    totalCLP,
    ticketPromedio,
    porMetodo,
  };

  const buffer = await renderToBuffer(
    <ReporteDocument
      desde={ymdToDMY(desdeYMD)}
      hasta={ymdToDMY(hastaYMD)}
      generadoEn={fmtFechaCL(new Date())}
      rows={rows}
      resumen={resumen}
    />,
  );

  const filename = `reporte-ventas_${desdeYMD}_a_${hastaYMD}.pdf`;
  const body = new Uint8Array(buffer);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Total-Ventas": String(totalVentas),
      "X-Total-CLP": String(totalCLP),
      "X-Ticket-Promedio": String(ticketPromedio),
    },
  });
}

// Keep fmtSoloFechaCL available without triggering unused-import
void fmtSoloFechaCL;
