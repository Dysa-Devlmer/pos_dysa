import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { CHILE_TZ, parseRangoDesdeURL } from "@/lib/reportes-fecha";

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
      _count: { select: { detalles: true } },
    },
  });

  // ─── Hoja 1: Ventas ───
  const ventasSheetData = ventas.map((v) => ({
    "N° Boleta": v.numeroBoleta,
    Fecha: fmtFechaCL(v.fecha),
    "Cliente RUT": v.cliente?.rut ?? "",
    "Cliente Nombre": v.cliente?.nombre ?? "",
    Vendedor: v.usuario.nombre,
    "Método Pago": v.metodoPago,
    Items: v._count.detalles,
    "Subtotal (CLP)": v.subtotal,
    "IVA 19% (CLP)": v.impuesto,
    "Total (CLP)": v.total,
  }));

  const wsVentas = XLSX.utils.json_to_sheet(
    ventasSheetData.length > 0
      ? ventasSheetData
      : [
          {
            "N° Boleta": "",
            Fecha: "",
            "Cliente RUT": "",
            "Cliente Nombre": "",
            Vendedor: "",
            "Método Pago": "",
            Items: "",
            "Subtotal (CLP)": "",
            "IVA 19% (CLP)": "",
            "Total (CLP)": "",
          },
        ],
  );
  wsVentas["!cols"] = [
    { wch: 24 }, // Boleta
    { wch: 18 }, // Fecha
    { wch: 14 }, // RUT
    { wch: 28 }, // Cliente
    { wch: 22 }, // Vendedor
    { wch: 14 }, // Método
    { wch: 7 }, // Items
    { wch: 14 }, // Subtotal
    { wch: 14 }, // IVA
    { wch: 14 }, // Total
  ];

  // ─── Hoja 2: Resumen ───
  const totalVentas = ventas.length;
  const totalCLP = ventas.reduce((a, v) => a + v.total, 0);
  const subtotalCLP = ventas.reduce((a, v) => a + v.subtotal, 0);
  const impuestoCLP = ventas.reduce((a, v) => a + v.impuesto, 0);
  const ticket = totalVentas > 0 ? Math.round(totalCLP / totalVentas) : 0;

  const byMetodo = new Map<string, { cantidad: number; total: number }>();
  for (const v of ventas) {
    const m = byMetodo.get(v.metodoPago) ?? { cantidad: 0, total: 0 };
    m.cantidad += 1;
    m.total += v.total;
    byMetodo.set(v.metodoPago, m);
  }

  const resumenRows: Array<(string | number)[]> = [
    ["Reporte de Ventas — POS Chile"],
    [],
    ["Período desde", desdeYMD],
    ["Período hasta", hastaYMD],
    ["Generado", fmtFechaCL(new Date())],
    [],
    ["KPIs", "Valor"],
    ["Total ventas (cantidad)", totalVentas],
    ["Subtotal (neto, CLP)", subtotalCLP],
    ["IVA 19% (CLP)", impuestoCLP],
    ["Total facturado (CLP)", totalCLP],
    ["Ticket promedio (CLP)", ticket],
    [],
    ["Desglose por método de pago", "", ""],
    ["Método", "Cantidad", "Total (CLP)"],
    ...[...byMetodo.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(
        ([metodo, v]) =>
          [metodo, v.cantidad, v.total] as (string | number)[],
      ),
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 16 }];

  // ─── Workbook ───
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(buffer);

  const filename = `reporte-ventas_${desdeYMD}_a_${hastaYMD}.xlsx`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Total-Ventas": String(totalVentas),
      "X-Total-CLP": String(totalCLP),
    },
  });
}
