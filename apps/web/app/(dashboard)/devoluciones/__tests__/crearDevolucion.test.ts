/**
 * Unit tests — crearDevolucion server action — DyPos CL web.
 *
 * F-6 Fase 0.2 (sesión 2026-04-30): cubre el path de devolución parcial
 * y total con recálculo de stock + cliente.
 *
 * Cubre:
 *   - Happy path parcial (1 de 2 unidades): no es total, stock revertido,
 *     ventas decrement, cliente NO se toca.
 *   - Happy path total (todas las unidades): esTotal=true, cliente.compras
 *     decrement + ultimaCompra recalculada.
 *   - Edge: monto devuelto proporcional al ratio subtotal/total
 *     (incluye descuentos e IVA).
 *   - Error: cantidad excede vendida → bloquea con números visibles.
 *   - Error: producto no figura en venta original → "no figura en la venta".
 *   - Error: venta tiene devolución total previa → bloquea.
 *   - Error: venta no existe → "La venta no existe".
 *   - Error: motivo < 5 chars → zod rechaza.
 *
 * Invariante: stock + venta.detalles[i].cantidad = ventas físicas (post
 * devolución). NO duplica stock.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { crearDevolucion } from "../actions";

const ventaConClienteMock = {
  id: 100,
  numeroBoleta: "B-20260430-XYZ12345",
  fecha: new Date("2026-04-30T12:00:00Z"),
  total: 11900,
  subtotal: 10000,
  metodoPago: "EFECTIVO" as const,
  clienteId: 5,
  cliente: { id: 5, nombre: "Juan Pérez", rut: "12.345.678-9" },
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
  devoluciones: [],
};

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });

  prismaMock.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: any) => cb(prismaMock),
  );
  prismaMock.$queryRaw.mockResolvedValue([]); // SELECT FOR UPDATE NOWAIT
  prismaMock.venta.findUnique.mockResolvedValue(ventaConClienteMock as never);
  prismaMock.venta.findMany.mockResolvedValue([]); // sin otras ventas
  prismaMock.devolucion.create.mockResolvedValue({
    id: 1,
    esTotal: false,
  } as never);
});

describe("crearDevolucion — happy path", () => {
  test("parcial (1 de 2 unidades): esTotal=false, stock revertido, cliente NO tocado", async () => {
    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Cliente cambió de opinión sobre 1 unidad",
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) throw new Error("expected ok+data");
    expect(result.data.esTotal).toBe(false);

    // Stock revert + ventas counter decrement
    expect(prismaMock.producto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: { increment: 1 },
        ventas: { decrement: 1 },
      },
    });

    // Cliente NO se toca en parcial
    expect(prismaMock.cliente.update).not.toHaveBeenCalled();

    // Devolución se crea con monto proporcional
    const createCall = prismaMock.devolucion.create.mock.calls[0]?.[0];
    expect(createCall?.data.esTotal).toBe(false);
    // ratio = 5000 / 10000 = 0.5 → monto = 11900 * 0.5 = 5950
    expect(createCall?.data.montoDevuelto).toBe(5950);
    expect(createCall?.data.motivo).toBe(
      "Cliente cambió de opinión sobre 1 unidad",
    );
  });

  test("total (todas las unidades): esTotal=true, cliente.compras decrement", async () => {
    prismaMock.devolucion.create.mockResolvedValue({
      id: 1,
      esTotal: true,
    } as never);

    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Cliente devolvió toda la compra",
      items: [{ productoId: 1, cantidadDevolver: 2 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) throw new Error("expected ok+data");
    expect(result.data.esTotal).toBe(true);

    // En total, monto = total venta completo
    const createCall = prismaMock.devolucion.create.mock.calls[0]?.[0];
    expect(createCall?.data.montoDevuelto).toBe(11900); // total completo
    expect(createCall?.data.esTotal).toBe(true);

    // Cliente: compras decrement + ultimaCompra recalculada
    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { decrement: 1 },
        ultimaCompra: null, // sin otras ventas activas
      },
    });
  });

  test("ratio en parcial respeta proporcionalidad sobre total (con IVA)", async () => {
    // Venta: subtotal 10k, total 11.9k (IVA 19%). Devolvemos 1 de 2 unidades.
    // ratio = 5000/10000 = 0.5 → monto = 11900 * 0.5 = 5950 (incluye IVA)
    await crearDevolucion({
      ventaId: 100,
      motivo: "Devolución parcial test ratio",
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    const createCall = prismaMock.devolucion.create.mock.calls[0]?.[0];
    expect(createCall?.data.montoDevuelto).toBe(5950);
  });

  test("clamping defensivo: monto NO excede total venta", async () => {
    // Edge: si por algún error de cálculo el ratio diera > 1, montoDevuelto
    // debe quedar capped al total. Simulamos creando una venta con subtotal
    // negativo (no debería pasar pero defensivo).
    prismaMock.venta.findUnique.mockResolvedValue({
      ...ventaConClienteMock,
      subtotal: 0, // edge: subtotal cero → ratio NaN → monto = 0
    } as never);

    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Test edge subtotal cero",
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(true);
    const createCall = prismaMock.devolucion.create.mock.calls[0]?.[0];
    expect(createCall?.data.montoDevuelto).toBe(0);
  });
});

describe("crearDevolucion — error paths", () => {
  test("cantidad devolver excede vendida → bloquea con números visibles", async () => {
    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Devolución excedida — test",
      items: [{ productoId: 1, cantidadDevolver: 5 }], // pidió 5, vendido 2
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("5");
    expect(result.error).toContain("2");
    expect(prismaMock.devolucion.create).not.toHaveBeenCalled();
  });

  test("producto no figura en venta original → error", async () => {
    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Test producto inexistente",
      items: [{ productoId: 999, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("999");
    expect(result.error).toContain("no figura");
    expect(prismaMock.devolucion.create).not.toHaveBeenCalled();
  });

  test("venta con devolución total previa → bloquea", async () => {
    prismaMock.venta.findUnique.mockResolvedValue({
      ...ventaConClienteMock,
      devoluciones: [{ esTotal: true, items: [] }],
    } as never);

    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Intento post total — debe rechazar",
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("devolución total");
    expect(prismaMock.devolucion.create).not.toHaveBeenCalled();
  });

  test("venta no existe → error", async () => {
    prismaMock.venta.findUnique.mockResolvedValue(null);

    const result = await crearDevolucion({
      ventaId: 999,
      motivo: "Venta inexistente test",
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("no existe");
  });

  test("motivo < 5 chars → zod rechaza", async () => {
    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "ok", // muy corto
      items: [{ productoId: 1, cantidadDevolver: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("5");
  });

  test("items vacío → zod rechaza", async () => {
    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Sin items en devolución test",
      items: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toMatch(/al menos un producto/i);
  });

  test("devoluciones previas se suman: si previa devolvió 1 + nueva 2 → excede vendido (2)", async () => {
    prismaMock.venta.findUnique.mockResolvedValue({
      ...ventaConClienteMock,
      devoluciones: [
        {
          esTotal: false,
          items: [{ productoId: 1, cantidad: 1 }],
        },
      ],
    } as never);

    const result = await crearDevolucion({
      ventaId: 100,
      motivo: "Suma con previa supera disponible — test",
      items: [{ productoId: 1, cantidadDevolver: 2 }], // ya devolvieron 1, quedan 1 disponible
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toMatch(/sólo quedan 1/i);
    expect(result.error).toContain("ya devueltas: 1");
  });
});
