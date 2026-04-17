import ExcelJS from "exceljs";
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
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let rango;
  try {
    rango = parseRangoDesdeURL(new URL(request.url));
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Parámetros de fecha inválidos" },
      { status: 400 }
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "POS Chile";
  workbook.created = new Date();

  // ─── Hoja 1: Ventas ───────────────────────────────────────
  const wsVentas = workbook.addWorksheet("Ventas");
  wsVentas.columns = [
    { header: "N° Boleta",      key: "numeroBoleta",  width: 24 },
    { header: "Fecha",          key: "fecha",          width: 18 },
    { header: "Cliente RUT",    key: "clienteRut",     width: 14 },
    { header: "Cliente Nombre", key: "clienteNombre",  width: 28 },
    { header: "Vendedor",       key: "vendedor",       width: 22 },
    { header: "Método Pago",    key: "metodoPago",     width: 14 },
    { header: "Items",          key: "items",          width: 7  },
    { header: "Subtotal (CLP)", key: "subtotal",       width: 16 },
    { header: "IVA 19% (CLP)", key: "impuesto",       width: 16 },
    { header: "Total (CLP)",   key: "total",           width: 16 },
  ];

  // Header bold
  wsVentas.getRow(1).font = { bold: true };
  wsVentas.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };

  for (const v of ventas) {
    wsVentas.addRow({
      numeroBoleta: v.numeroBoleta,
      fecha:        fmtFechaCL(v.fecha),
      clienteRut:   v.cliente?.rut ?? "",
      clienteNombre: v.cliente?.nombre ?? "",
      vendedor:     v.usuario.nombre,
      metodoPago:   v.metodoPago,
      items:        v._count.detalles,
      subtotal:     v.subtotal,
      impuesto:     v.impuesto,
      total:        v.total,
    });
  }

  // ─── Hoja 2: Resumen ──────────────────────────────────────
  const wsResumen = workbook.addWorksheet("Resumen");
  wsResumen.columns = [
    { key: "a", width: 32 },
    { key: "b", width: 18 },
    { key: "c", width: 16 },
  ];

  const totalVentas  = ventas.length;
  const totalCLP     = ventas.reduce((a, v) => a + v.total, 0);
  const subtotalCLP  = ventas.reduce((a, v) => a + v.subtotal, 0);
  const impuestoCLP  = ventas.reduce((a, v) => a + v.impuesto, 0);
  const ticket       = totalVentas > 0 ? Math.round(totalCLP / totalVentas) : 0;

  const byMetodo = new Map<string, { cantidad: number; total: number }>();
  for (const v of ventas) {
    const m = byMetodo.get(v.metodoPago) ?? { cantidad: 0, total: 0 };
    m.cantidad += 1;
    m.total    += v.total;
    byMetodo.set(v.metodoPago, m);
  }

  // Título
  const titleRow = wsResumen.addRow(["Reporte de Ventas — POS Chile"]);
  titleRow.font = { bold: true, size: 14 };

  wsResumen.addRow([]);
  wsResumen.addRow(["Período desde", desdeYMD]);
  wsResumen.addRow(["Período hasta", hastaYMD]);
  wsResumen.addRow(["Generado",      fmtFechaCL(new Date())]);
  wsResumen.addRow([]);

  const kpiHeader = wsResumen.addRow(["KPIs", "Valor"]);
  kpiHeader.font = { bold: true };

  wsResumen.addRow(["Total ventas (cantidad)",   totalVentas]);
  wsResumen.addRow(["Subtotal (neto, CLP)",       subtotalCLP]);
  wsResumen.addRow(["IVA 19% (CLP)",              impuestoCLP]);
  wsResumen.addRow(["Total facturado (CLP)",      totalCLP]);
  wsResumen.addRow(["Ticket promedio (CLP)",      ticket]);
  wsResumen.addRow([]);

  const metodoTitle = wsResumen.addRow(["Desglose por método de pago"]);
  metodoTitle.font = { bold: true };

  const metodoHeader = wsResumen.addRow(["Método", "Cantidad", "Total (CLP)"]);
  metodoHeader.font = { bold: true };

  for (const [metodo, data] of [...byMetodo.entries()].sort((a, b) => b[1].total - a[1].total)) {
    wsResumen.addRow([metodo, data.cantidad, data.total]);
  }

  // ─── Buffer y Response ────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const body   = new Uint8Array(buffer as ArrayBuffer);
  const filename = `reporte-ventas_${desdeYMD}_a_${hastaYMD}.xlsx`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length":      String(body.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
      "X-Total-Ventas":      String(totalVentas),
      "X-Total-CLP":         String(totalCLP),
    },
  });
}
