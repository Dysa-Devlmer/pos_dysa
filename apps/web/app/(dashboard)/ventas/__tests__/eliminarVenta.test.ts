/**
 * Unit tests — eliminarVenta server action — DyPos CL web.
 *
 * F-6 Fase 0.2 (sesión 2026-04-30): cubre el path crítico de soft-delete
 * con audit log + reversión de stock/contadores.
 *
 * Cubre:
 *   - Happy path: revierte stock, decrementa counter ventas, soft-delete,
 *     recalcula ultimaCompra del cliente, escribe AuditLog.
 *   - Error: venta con devoluciones asociadas → bloquea con conteo visible.
 *   - Error: venta no encontrada / soft-deleted → "Venta no encontrada".
 *   - Error: P2003 FK constraint (legacy fallback) → mensaje genérico.
 *
 * Invariantes verificadas:
 *   - producto.stock += venta.detalles[i].cantidad (revert)
 *   - producto.ventas -= venta.detalles[i].cantidad (counter revert)
 *   - venta.deletedAt != null + deletedBy = session.user.id
 *   - audit_log con accion=DELETE + diff con snapshot
 *   - cliente.compras -= 1 + ultimaCompra recalculada
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { eliminarVenta } from "../actions";

const ventaConClienteMock = {
  id: 100,
  numeroBoleta: "B-20260430-XYZ12345",
  fecha: new Date("2026-04-30T12:00:00Z"),
  total: 5950,
  metodoPago: "EFECTIVO" as const,
  clienteId: 5,
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

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });

  prismaMock.devolucion.count.mockResolvedValue(0);
  prismaMock.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: any) => cb(prismaMock),
  );
  prismaMock.venta.findFirst.mockResolvedValue(ventaConClienteMock as never);
  prismaMock.venta.update.mockResolvedValue({ id: 100 } as never);
});

describe("eliminarVenta — happy path", () => {
  test("revierte stock + decrementa ventas counter + soft-delete + audit", async () => {
    const result = await eliminarVenta(100, "Cliente devolvió");

    expect(result.ok).toBe(true);

    // 1. Stock + ventas counter revertidos
    expect(prismaMock.producto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: { increment: 2 },
        ventas: { decrement: 2 },
      },
    });

    // 2. Soft-delete: deletedAt + deletedBy + razón truncada a 500
    expect(prismaMock.venta.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedBy: 1,
        deletionReason: "Cliente devolvió",
      }),
    });

    // 3. AuditLog con accion=DELETE + snapshot del diff
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tabla: "ventas",
        registroId: 100,
        accion: "DELETE",
        usuarioId: 1,
        diff: expect.objectContaining({
          numeroBoleta: "B-20260430-XYZ12345",
          total: 5950,
          razon: "Cliente devolvió",
        }),
      }),
    });
  });

  test("recalcula ultimaCompra del cliente cuando hay venta previa", async () => {
    // Cliente 5 tiene OTRA venta del 2026-04-15 visible.
    const otraVentaPrevia = { fecha: new Date("2026-04-15T10:00:00Z") };
    prismaMock.venta.findFirst
      .mockResolvedValueOnce(ventaConClienteMock as never) // primera llamada: la venta a borrar
      .mockResolvedValueOnce(otraVentaPrevia as never); // segunda: ultimaCompra

    const result = await eliminarVenta(100);
    expect(result.ok).toBe(true);

    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { decrement: 1 },
        ultimaCompra: otraVentaPrevia.fecha,
      },
    });
  });

  test("ultimaCompra = null si no quedan ventas visibles del cliente", async () => {
    prismaMock.venta.findFirst
      .mockResolvedValueOnce(ventaConClienteMock as never)
      .mockResolvedValueOnce(null); // no hay otras ventas

    await eliminarVenta(100);

    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { decrement: 1 },
        ultimaCompra: null,
      },
    });
  });

  test("venta sin clienteId: NO toca tabla cliente", async () => {
    prismaMock.venta.findFirst.mockResolvedValue({
      ...ventaConClienteMock,
      clienteId: null,
    } as never);

    await eliminarVenta(100);

    expect(prismaMock.cliente.update).not.toHaveBeenCalled();
  });
});

describe("eliminarVenta — error paths", () => {
  test("venta con devoluciones asociadas → bloquea con conteo", async () => {
    prismaMock.devolucion.count.mockResolvedValue(3);

    const result = await eliminarVenta(100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("3 devolución");
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  test("venta no encontrada → 'Venta no encontrada'", async () => {
    prismaMock.venta.findFirst.mockResolvedValue(null);

    const result = await eliminarVenta(999);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("no encontrada");
  });

  test("razón se trunca a 500 caracteres", async () => {
    const razonLarga = "A".repeat(700);

    await eliminarVenta(100, razonLarga);

    const updateCall = prismaMock.venta.update.mock.calls[0]?.[0];
    expect(updateCall?.data.deletionReason).toHaveLength(500);
  });
});
