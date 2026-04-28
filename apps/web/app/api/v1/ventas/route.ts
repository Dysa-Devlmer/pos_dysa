import { prisma, MetodoPago, EstadoApertura } from "@repo/db";
import { z } from "zod";
import { requireAuth, requireRateLimit, jsonOk, jsonError, parsePagination } from "../_helpers";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";

export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const clienteId = searchParams.get("clienteId");
  const metodoPago = searchParams.get("metodoPago");

  // R5 (audit 2026-04-25) — IDOR fix. CAJERO solo ve sus propias ventas;
  // ADMIN ve todo. Antes, cualquier cajero autenticado podia listar el
  // historial completo de la tienda (datos sensibles: clientes, montos,
  // metodos de pago de otros turnos). Filtro server-side, no negociable.
  const usuarioFilter =
    session.user.rol === "CAJERO"
      ? { usuarioId: Number(session.user.id) }
      : {};

  const where = {
    ...VENTAS_VISIBLES,
    ...usuarioFilter,
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta + "T23:59:59Z") } : {}),
          },
        }
      : {}),
    ...(clienteId ? { clienteId: Number(clienteId) } : {}),
    ...(metodoPago ? { metodoPago: metodoPago as MetodoPago } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, rut: true } },
        usuario: { select: { id: true, nombre: true } },
        detalles: {
          include: { producto: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { fecha: "desc" },
      skip,
      take: limit,
    }),
    prisma.venta.count({ where }),
  ]);

  return jsonOk(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

// DV3 (audit 2026-04-25) — `.max(10000)` evita overflow en `precio * cantidad`.
// Sin esto, cantidad: 999_999_999 con precio 100k revienta INT4 Postgres (NaN/
// Infinity en DB) y el `$transaction` aborta. 10k unidades por linea es un cap
// razonable: el POS chico real no factura 10k unidades por SKU en una boleta.
const ItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive().max(10_000),
});

// F-9: split tender. MIXTO no es válido en un PagoSchema individual.
const PagoSchema = z.object({
  metodo: z
    .nativeEnum(MetodoPago)
    .refine((v) => v !== MetodoPago.MIXTO, {
      message: "MIXTO no es válido como método de un pago individual",
    }),
  monto: z.number().int().positive(),
  referencia: z.string().max(100).optional(),
});

const CreateVentaSchema = z.object({
  items: z.array(ItemSchema).min(1),
  // CV3 (audit 2026-04-28) — `.nullable()` agregado para alinear con
  // Prisma (`clienteId Int?`) y con el shared schema mobile que envía
  // `null` cuando la venta no tiene cliente asociado. Sin nullable, un
  // POST {clienteId: null} caía a 400 silenciosamente. La rama Prisma
  // ya manejaba ambos undefined y null como "sin cliente"; esto solo
  // alinea el contract de input.
  clienteId: z.number().int().positive().nullable().optional(),
  // metodoPago legacy: si NO viene `pagos`, se usa para compatibilidad mobile/CLI.
  metodoPago: z.nativeEnum(MetodoPago).optional(),
  pagos: z.array(PagoSchema).min(1).optional(),
  montoRecibido: z.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = CreateVentaSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
  }

  const { items, clienteId, metodoPago, pagos, montoRecibido } = parsed.data;
  const usuarioId = Number(session.user.id);

  // F-9: resolver apertura activa del cajero (requerida)
  const apertura = await prisma.aperturaCaja.findFirst({
    where: { usuarioId, estado: EstadoApertura.ABIERTA },
    select: { id: true },
  });
  if (!apertura) {
    return jsonError("Debe abrir caja primero", 422);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productos = await tx.producto.findMany({
        where: { id: { in: items.map((i) => i.productoId) } },
        select: { id: true, nombre: true, precio: true, stock: true, activo: true },
      });

      for (const item of items) {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod || !prod.activo) {
          throw new Error(`Producto ${item.productoId} no encontrado o inactivo`);
        }
        if (prod.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
        }
      }

      let subtotal = 0;
      const detalles = items.map((item) => {
        const prod = productos.find((p) => p.id === item.productoId)!;
        const lineSubtotal = prod.precio * item.cantidad;
        subtotal += lineSubtotal;
        return {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: prod.precio,
          subtotal: lineSubtotal,
        };
      });

      const impuesto = Math.round(subtotal * 0.19);
      const total = subtotal + impuesto;
      const numeroBoleta = `BOL-${Date.now()}`;

      // Resolver pagos. Normalizamos al mismo shape: { metodo, monto, referencia? }.
      // metodoPago a nivel root sigue siendo back-compat: si NO viene `pagos`
      // lo tratamos como pago único con monto = total.
      const pagosInput: { metodo: MetodoPago; monto: number; referencia?: string }[] =
        pagos && pagos.length > 0
          ? pagos.map((p) => ({
              metodo: p.metodo,
              monto: p.monto,
              referencia: p.referencia,
            }))
          : [{ metodo: metodoPago ?? MetodoPago.EFECTIVO, monto: total }];

      const sumaPagos = pagosInput.reduce((a, p) => a + p.monto, 0);
      if (sumaPagos !== total) {
        throw new Error(
          `La suma de pagos (${sumaPagos}) no coincide con el total (${total})`,
        );
      }
      const sumaEfectivo = pagosInput
        .filter((p) => p.metodo === MetodoPago.EFECTIVO)
        .reduce((a, p) => a + p.monto, 0);

      let vuelto: number | null = null;
      let recibido: number | null = null;
      if (sumaEfectivo > 0) {
        const r = montoRecibido ?? sumaEfectivo;
        if (r < sumaEfectivo) {
          throw new Error(
            `Monto recibido (${r}) menor al efectivo declarado (${sumaEfectivo})`,
          );
        }
        recibido = r;
        vuelto = r - sumaEfectivo;
      }

      const metodoFlat: MetodoPago =
        pagosInput.length === 1 ? pagosInput[0]!.metodo : MetodoPago.MIXTO;

      const venta = await tx.venta.create({
        data: {
          numeroBoleta,
          subtotal,
          impuesto,
          total,
          metodoPago: metodoFlat,
          usuarioId,
          clienteId: clienteId ?? null,
          aperturaId: apertura.id,
          montoRecibido: recibido,
          vuelto,
          detalles: { create: detalles },
          pagos: {
            create: pagosInput.map((p) => ({
              metodo: p.metodo,
              monto: p.monto,
              referencia: p.referencia ?? null,
            })),
          },
        },
        include: { detalles: true, pagos: true },
      });

      for (const item of items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: {
            stock: { decrement: item.cantidad },
            ventas: { increment: item.cantidad },
          },
        });
      }

      if (clienteId) {
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            compras: { increment: 1 },
            ultimaCompra: new Date(),
          },
        });
      }

      return venta;
    });

    return jsonOk(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear venta";
    // 409 Conflict para stock insuficiente y producto inactivo/missing —
    // cliente mobile (M4) lo distingue de 422 validación para mostrar UI
    // específica ("Stock insuficiente en X") vs mensaje genérico.
    if (/Stock insuficiente|no encontrado|inactivo/i.test(msg)) {
      return jsonError(msg, 409);
    }
    return jsonError(msg, 422);
  }
}
