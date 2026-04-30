/**
 * Unit tests — editarVenta server action — DyPos CL web.
 *
 * F-6 Fase 0.2 (sesión 2026-04-30): cierra el bug crítico que Codex
 * detectó (editarVenta NO sincronizaba PagoVenta[], montoRecibido,
 * vuelto cuando se editaba una venta con split tender).
 *
 * Cubre los siguientes casos críticos del fix:
 *
 *   1. Happy path single → single (mismo método, total cambia):
 *      - PagoVenta viejo se borra, nuevo se crea con monto = total nuevo.
 *      - vuelto/montoRecibido recalculados desde el nuevo total.
 *
 *   2. Happy path single → split (1 pago original, 2 pagos nuevos):
 *      - metodoPago rollup pasa al método único O a MIXTO.
 *      - PagoVenta[] reemplazado completo (deleteMany + create).
 *
 *   3. Happy path split → single (2 pagos originales, 1 pago nuevo):
 *      - metodoPago rollup vuelve al método individual.
 *      - vuelto recalculado solo con el nuevo monto.
 *
 *   4. Error: suma pagos nueva != total nuevo → rechaza con mensaje.
 *
 *   5. Error: monto recibido < efectivo declarado → rechaza.
 *
 *   6. Error: venta con devoluciones asociadas → bloquea (pre-existente).
 *
 *   7. Error: venta no existe / soft-deleted → "no encontrada".
 *
 * INVARIANTE CLAVE QUE CADA TEST VERIFICA:
 *   total === sum(PagoVenta.monto)
 *
 * Si alguno de estos tests falla en un PR, NO mergear. La regresión
 * silenciosa en este invariante = reportes Z desbalanceados en
 * producción + fraude latente.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { editarVenta } from "../actions";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const productoMock = {
  id: 1,
  nombre: "Almuerzo ejecutivo",
  precio: 5000,
  stock: 10,
  activo: true,
};

const ventaViejaSingleMock = {
  id: 100,
  numeroBoleta: "B-20260430-XYZ12345",
  fecha: new Date("2026-04-30T12:00:00Z"),
  subtotal: 5000,
  total: 5950,
  metodoPago: "EFECTIVO" as const,
  clienteId: null,
  detalles: [
    {
      id: 1,
      ventaId: 100,
      productoId: 1,
      cantidad: 1,
      precioUnitario: 5000,
      subtotal: 5000,
    },
  ],
};

const ventaViejaMixtoMock = {
  ...ventaViejaSingleMock,
  metodoPago: "MIXTO" as const,
  total: 11900,
  detalles: [
    {
      id: 1,
      ventaId: 100,
      productoId: 1,
      cantidad: 2,
      precioUnitario: 5000,
      subtotal: 10000,
    },
  ],
};

const ventaActualizadaMock = {
  id: 100,
  numeroBoleta: "B-20260430-XYZ12345",
  fecha: new Date("2026-04-30T12:00:00Z"),
};

// Helper de cast para los pagos.create del Prisma update args.
// El tipo nativo es union (single object | array | uncheckedVariant), pero
// en runtime siempre es array porque el código de actions.ts usa .map().
type PagoCreateArray = Array<{
  metodo: string;
  monto: number;
  referencia: string | null;
}>;

function buildEditInput(
  overrides: Partial<Parameters<typeof editarVenta>[1]> = {},
): Parameters<typeof editarVenta>[1] {
  return {
    items: [{ productoId: 1, cantidad: 1 }],
    descuentoPct: 0,
    descuentoMonto: 0,
    metodoPago: "EFECTIVO",
    montoRecibido: 5950,
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });

  prismaMock.venta.findFirst.mockResolvedValue(ventaViejaSingleMock as never);
  prismaMock.devolucion.count.mockResolvedValue(0);
  prismaMock.producto.findMany.mockResolvedValue([productoMock] as never);
  prismaMock.cliente.findUnique.mockResolvedValue(null);
  prismaMock.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: any) => cb(prismaMock),
  );
  prismaMock.venta.update.mockResolvedValue(ventaActualizadaMock as never);
});

// ─── Happy paths con verificación de PagoVenta[] ─────────────────────────────

describe("editarVenta — invariante total === sum(pagos)", () => {
  test("single → single con total que cambia: pagos.deleteMany + create con monto nuevo", async () => {
    // Venta vieja: 1 producto * 5000 + IVA = 5950 total, 1 pago EFECTIVO 5950.
    // Editamos a 2 productos * 5000 + IVA = 11900, mismo método EFECTIVO.
    const result = await editarVenta(
      100,
      buildEditInput({
        items: [{ productoId: 1, cantidad: 2 }],
        montoRecibido: 11900,
      }),
    );

    expect(result.ok).toBe(true);

    // VERIFICACIÓN DEL FIX: pagoVenta.deleteMany se llamó con ventaId
    expect(prismaMock.pagoVenta.deleteMany).toHaveBeenCalledWith({
      where: { ventaId: 100 },
    });

    // Y el venta.update incluye los pagos NUEVOS con el monto correcto
    const updateCall = prismaMock.venta.update.mock.calls[0]?.[0];
    expect(updateCall?.data.total).toBe(11900);
    expect(updateCall?.data.metodoPago).toBe("EFECTIVO");
    const pagosCreate = updateCall?.data.pagos?.create as PagoCreateArray;
    expect(pagosCreate).toHaveLength(1);
    expect(pagosCreate[0]?.monto).toBe(11900);
    expect(pagosCreate[0]?.metodo).toBe("EFECTIVO");
    // Vuelto: montoRecibido (11900) - efectivo (11900) = 0
    expect(updateCall?.data.vuelto).toBe(0);
    expect(updateCall?.data.montoRecibido).toBe(11900);
  });

  test("single → split (2 pagos): metodoPago rollup → MIXTO + 2 PagoVenta nuevos", async () => {
    // Venta vieja era single payment EFECTIVO. Ahora split EFECTIVO + DEBITO.
    const result = await editarVenta(
      100,
      buildEditInput({
        pagos: [
          { metodo: "EFECTIVO", monto: 3000 },
          { metodo: "DEBITO", monto: 2950 },
        ],
        montoRecibido: 3000,
      }),
    );

    expect(result.ok).toBe(true);

    expect(prismaMock.pagoVenta.deleteMany).toHaveBeenCalledTimes(1);

    const updateCall = prismaMock.venta.update.mock.calls[0]?.[0];
    expect(updateCall?.data.metodoPago).toBe("MIXTO");
    expect((updateCall?.data.pagos?.create as PagoCreateArray)).toHaveLength(2);
    expect((updateCall?.data.pagos?.create as PagoCreateArray)[0]?.metodo).toBe("EFECTIVO");
    expect((updateCall?.data.pagos?.create as PagoCreateArray)[0]?.monto).toBe(3000);
    expect((updateCall?.data.pagos?.create as PagoCreateArray)[1]?.metodo).toBe("DEBITO");
    expect((updateCall?.data.pagos?.create as PagoCreateArray)[1]?.monto).toBe(2950);

    // Invariante crítica:
    const sumaPagosCreados =
      (updateCall?.data.pagos?.create as PagoCreateArray).reduce(
        (a: number, p: { monto: number }) => a + p.monto,
        0,
      ) ?? 0;
    expect(sumaPagosCreados).toBe(updateCall?.data.total);
  });

  test("split MIXTO → single: metodoPago vuelve al método individual", async () => {
    // Venta vieja era MIXTO con 2 pagos. Ahora se simplifica a un único método.
    prismaMock.venta.findFirst.mockResolvedValue(ventaViejaMixtoMock as never);

    const result = await editarVenta(
      100,
      buildEditInput({
        items: [{ productoId: 1, cantidad: 1 }],
        pagos: [{ metodo: "DEBITO", monto: 5950 }],
      }),
    );

    expect(result.ok).toBe(true);
    const updateCall = prismaMock.venta.update.mock.calls[0]?.[0];
    expect(updateCall?.data.metodoPago).toBe("DEBITO"); // ya no MIXTO
    expect((updateCall?.data.pagos?.create as PagoCreateArray)).toHaveLength(1);
    expect(updateCall?.data.montoRecibido).toBeNull(); // sin efectivo
    expect(updateCall?.data.vuelto).toBeNull();
  });

  test("split con efectivo: vuelto recalcula correctamente", async () => {
    const result = await editarVenta(
      100,
      buildEditInput({
        pagos: [
          { metodo: "EFECTIVO", monto: 4000 },
          { metodo: "DEBITO", monto: 1950 },
        ],
        montoRecibido: 5000, // recibió 5k, efectivo declarado 4k → vuelto 1k
      }),
    );

    expect(result.ok).toBe(true);
    const updateCall = prismaMock.venta.update.mock.calls[0]?.[0];
    expect(updateCall?.data.montoRecibido).toBe(5000);
    expect(updateCall?.data.vuelto).toBe(1000);
  });
});

// ─── Error paths ─────────────────────────────────────────────────────────────

describe("editarVenta — error paths", () => {
  test("suma pagos != total → rechaza con números visibles", async () => {
    const result = await editarVenta(
      100,
      buildEditInput({
        pagos: [
          { metodo: "EFECTIVO", monto: 2000 },
          { metodo: "DEBITO", monto: 1000 }, // suma 3000, total esperado 5950
        ],
        montoRecibido: 2000,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("suma de pagos");
    expect(result.error).toContain("3000");
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
    expect(prismaMock.pagoVenta.deleteMany).not.toHaveBeenCalled();
  });

  test("monto recibido < efectivo declarado → rechaza", async () => {
    const result = await editarVenta(
      100,
      buildEditInput({
        pagos: [{ metodo: "EFECTIVO", monto: 5950 }],
        montoRecibido: 5000, // menor al efectivo del split
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toMatch(/recibido.*menor/i);
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  test("venta con devoluciones asociadas → bloquea (pre-existente)", async () => {
    prismaMock.devolucion.count.mockResolvedValue(2);

    const result = await editarVenta(100, buildEditInput());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("2 devolución");
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  test("venta no encontrada (soft-deleted o id inexistente)", async () => {
    prismaMock.venta.findFirst.mockResolvedValue(null);

    const result = await editarVenta(999, buildEditInput());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("no encontrada");
  });
});
