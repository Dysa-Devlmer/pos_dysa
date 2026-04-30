/**
 * Unit tests — restaurarVenta server action — DyPos CL web.
 *
 * F-6 Fase 0.2 (sesión 2026-04-30): cubre el path de restauración
 * con re-aplicación de stock + audit log.
 *
 * Cubre:
 *   - Happy path: re-aplica stock decrement, increment ventas counter,
 *     borra deletedAt/deletedBy/deletionReason, escribe AuditLog RESTORE.
 *   - Error: usuario no es ADMIN → "Solo un administrador..."
 *   - Error: venta no eliminada → "no está eliminada"
 *   - Error: stock insuficiente → mensaje sin prefix STOCK_INSUFICIENTE.
 *   - Error: producto del detalle ya no existe → mensaje claro.
 *
 * Invariante: la restauración debe ser perfecta inversa del eliminarVenta
 * (mismo stock, mismo counter, ultimaCompra recalculada considerando esta).
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { restaurarVenta } from "../actions";

const ventaEliminadaMock = {
  id: 100,
  numeroBoleta: "B-20260430-XYZ12345",
  fecha: new Date("2026-04-30T12:00:00Z"),
  total: 5950,
  clienteId: 5,
  deletedAt: new Date("2026-04-30T15:00:00Z"),
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

const productoDisponibleMock = {
  id: 1,
  nombre: "Almuerzo ejecutivo",
  stock: 10,
  activo: true,
};

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });

  prismaMock.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: any) => cb(prismaMock),
  );
  prismaMock.venta.findUnique.mockResolvedValue(ventaEliminadaMock as never);
  prismaMock.producto.findMany.mockResolvedValue([
    productoDisponibleMock,
  ] as never);
  prismaMock.venta.findFirst.mockResolvedValue(null); // sin ultimas previas
  prismaMock.venta.update.mockResolvedValue({ id: 100 } as never);
});

describe("restaurarVenta — happy path", () => {
  test("re-aplica stock + ventas counter + limpia deletedAt + audit RESTORE", async () => {
    const result = await restaurarVenta(100, "Restauración solicitada");

    expect(result.ok).toBe(true);

    // 1. Stock decrement + ventas increment (re-apply de la venta)
    expect(prismaMock.producto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: { decrement: 2 },
        ventas: { increment: 2 },
      },
    });

    // 2. venta.update limpia los 3 campos de soft-delete
    expect(prismaMock.venta.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    });

    // 3. AuditLog accion=RESTORE
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tabla: "ventas",
        registroId: 100,
        accion: "RESTORE",
        usuarioId: 1,
        diff: expect.objectContaining({
          razon: "Restauración solicitada",
        }),
      }),
    });
  });

  test("cliente: incrementa compras + ultimaCompra = max(esta, otras)", async () => {
    const ventaMasReciente = { fecha: new Date("2026-04-29T10:00:00Z") };
    prismaMock.venta.findFirst.mockResolvedValue(ventaMasReciente as never);

    await restaurarVenta(100);

    // La venta restaurada (2026-04-30) es MÁS reciente que la otra (2026-04-29)
    // → ultimaCompra debe ser la de la venta restaurada.
    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { increment: 1 },
        ultimaCompra: ventaEliminadaMock.fecha,
      },
    });
  });

  test("ultimaCompra mantiene la otra venta si es más reciente", async () => {
    const ventaPosterior = { fecha: new Date("2026-05-15T10:00:00Z") };
    prismaMock.venta.findFirst.mockResolvedValue(ventaPosterior as never);

    await restaurarVenta(100);

    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { increment: 1 },
        ultimaCompra: ventaPosterior.fecha, // mantiene la posterior
      },
    });
  });
});

describe("restaurarVenta — error paths", () => {
  test("usuario no ADMIN → bloquea", async () => {
    mockSession({ id: "2", rol: "CAJERO" });

    const result = await restaurarVenta(100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("administrador");
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  test("venta no encontrada → error", async () => {
    prismaMock.venta.findUnique.mockResolvedValue(null);

    const result = await restaurarVenta(999);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("no encontrada");
  });

  test("venta no eliminada → error 'no está eliminada'", async () => {
    prismaMock.venta.findUnique.mockResolvedValue({
      ...ventaEliminadaMock,
      deletedAt: null, // ya está activa
    } as never);

    const result = await restaurarVenta(100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("no está eliminada");
  });

  test("stock insuficiente → error con disponible/requerido (sin prefix interno)", async () => {
    prismaMock.producto.findMany.mockResolvedValue([
      { ...productoDisponibleMock, stock: 1 },
    ] as never);

    const result = await restaurarVenta(100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("Almuerzo");
    expect(result.error).toContain("disponible: 1");
    expect(result.error).toContain("requerido: 2");
    // El prefix interno NO debe leakearse al usuario
    expect(result.error).not.toContain("STOCK_INSUFICIENTE:");
    expect(prismaMock.venta.update).not.toHaveBeenCalled();
  });

  test("producto del detalle ya no existe (caso edge) → error claro", async () => {
    prismaMock.producto.findMany.mockResolvedValue([]); // ningún producto

    const result = await restaurarVenta(100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("ya no existe");
  });
});
