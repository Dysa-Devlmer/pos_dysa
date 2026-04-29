/**
 * Unit tests — crearVenta server action — POS Chile web.
 *
 * F-6 (audit Claude Code CLI 2026-04-28) test #1 prioritario: cubre la
 * server action más crítica del sistema. Una regresión silenciosa en
 * `crearVenta` afecta CADA venta del POS — pierde dinero o corrompe
 * stock.
 *
 * Cubre:
 *   - Happy path single payment
 *   - Happy path split tender (2 métodos = MIXTO)
 *   - Error: sin autenticación
 *   - Error: producto no existe
 *   - Error: producto inactivo
 *   - Error: stock insuficiente
 *   - Error: suma pagos != total
 *   - Error: sin apertura de caja
 *   - Happy con cliente: counters compras + ultimaCompra
 *
 * Mock strategy:
 *   - `$transaction(cb)` → invoca `cb(prismaMock)` para que las llamadas
 *     dentro del callback usen los mismos handles del store.
 *   - `prisma.producto.findMany` → retorna productos según test.
 *   - `prisma.aperturaCaja.findFirst` → retorna apertura activa o null.
 *   - `tx.venta.create` → retorna { id, numeroBoleta, fecha }.
 *   - `tx.producto.update` + `tx.cliente.update` → vi.fn() spy verifica
 *     que se llamaron N veces con los args correctos (decrement stock,
 *     increment counters).
 *
 * Si este suite falla en un PR, NO mergear. Cada test cubre un riesgo
 * económico real de producción.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { crearVenta } from "../actions";

const productoMock = {
  id: 1,
  nombre: "Almuerzo ejecutivo",
  precio: 5000,
  stock: 10,
  activo: true,
};

/**
 * Helper para construir input válido con defaults razonables.
 * El zod schema de `ventaInput` exige descuentoPct + descuentoMonto
 * presentes (con default 0). Pasar el override solo de los campos
 * relevantes para cada test mejora legibilidad.
 */
function buildVentaInput(
  overrides: Partial<Parameters<typeof crearVenta>[0]> = {},
): Parameters<typeof crearVenta>[0] {
  return {
    items: [{ productoId: 1, cantidad: 1 }],
    descuentoPct: 0,
    descuentoMonto: 0,
    metodoPago: "EFECTIVO",
    montoRecibido: 5950,
    ...overrides,
  };
}

const ventaCreatedMock = {
  id: 100,
  numeroBoleta: "B-20260429-ABC12345",
  fecha: new Date("2026-04-29T15:00:00Z"),
};

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });

  // Defaults razonables — cada test los override según necesite.
  prismaMock.producto.findMany.mockResolvedValue([productoMock] as never);
  prismaMock.cliente.findUnique.mockResolvedValue(null);
  prismaMock.aperturaCaja.findFirst.mockResolvedValue({
    id: 1,
  } as never);
  // El callback de $transaction recibe `tx` que en mock = prismaMock mismo.
  // Así las llamadas a tx.venta.create, tx.producto.update, etc. usan los
  // mocks ya configurados.
  prismaMock.$transaction.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (cb: any) => cb(prismaMock),
  );
  prismaMock.venta.create.mockResolvedValue(ventaCreatedMock as never);
});

describe("crearVenta — happy paths", () => {
  test("happy single payment: descuenta stock, suma counter ventas", async () => {
    const result = await crearVenta(
      buildVentaInput({
        items: [{ productoId: 1, cantidad: 2 }],
        montoRecibido: 11900, // 2*5000 + 19% IVA = 11.900
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) {
      throw new Error("test contract: ok=true expected");
    }
    expect(result.data.id).toBe(100);
    expect(result.data.numeroBoleta).toMatch(/^B-/);

    // Stock decrement + ventas increment
    expect(prismaMock.producto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stock: { decrement: 2 },
        ventas: { increment: 2 },
      },
    });
  });

  test("happy split tender (efectivo + débito) → metodoPago=MIXTO", async () => {
    const result = await crearVenta(
      buildVentaInput({
        pagos: [
          { metodo: "EFECTIVO", monto: 3000 },
          { metodo: "DEBITO", monto: 2950 },
        ],
        montoRecibido: 3000,
      }),
    );

    expect(result.ok).toBe(true);

    // El primer arg de venta.create debe tener metodoPago: "MIXTO"
    const createCall = prismaMock.venta.create.mock.calls[0]?.[0];
    expect(createCall?.data.metodoPago).toBe("MIXTO");
    // El nested create debe registrar 2 pagos
    expect(createCall?.data.pagos?.create).toHaveLength(2);
  });

  test("happy con clienteId: incrementa compras + setea ultimaCompra", async () => {
    prismaMock.cliente.findUnique.mockResolvedValue({ id: 5 } as never);

    await crearVenta(buildVentaInput({ clienteId: 5 }));

    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        compras: { increment: 1 },
        ultimaCompra: ventaCreatedMock.fecha,
      },
    });
  });
});

describe("crearVenta — error paths", () => {
  test("sin sesión → throw 'No autenticado' propagado como error.message", async () => {
    mockSession(null);

    const result = await crearVenta(buildVentaInput());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("No autenticado");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("producto inexistente → 'no existen' sin tocar DB", async () => {
    prismaMock.producto.findMany.mockResolvedValue([]); // ninguno

    const result = await crearVenta(
      buildVentaInput({ items: [{ productoId: 999, cantidad: 1 }] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("no existen");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("producto inactivo → bloquea con nombre del producto", async () => {
    prismaMock.producto.findMany.mockResolvedValue([
      { ...productoMock, activo: false },
    ] as never);

    const result = await crearVenta(buildVentaInput());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("inactivo");
    expect(result.error).toContain("Almuerzo");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("stock insuficiente → bloquea con disponible/solicitado", async () => {
    prismaMock.producto.findMany.mockResolvedValue([
      { ...productoMock, stock: 1 },
    ] as never);

    const result = await crearVenta(
      buildVentaInput({
        items: [{ productoId: 1, cantidad: 5 }],
        montoRecibido: 29750,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("Stock insuficiente");
    expect(result.error).toContain("disponible: 1");
    expect(result.error).toContain("solicitado: 5");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("suma pagos != total → rechaza con números visibles", async () => {
    const result = await crearVenta(
      buildVentaInput({
        pagos: [
          { metodo: "EFECTIVO", monto: 3000 },
          { metodo: "DEBITO", monto: 1000 }, // suma 4000, total esperado 5950
        ],
        montoRecibido: 3000,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("suma de pagos");
    expect(result.error).toContain("4000");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("sin apertura caja activa → bloquea antes del $transaction", async () => {
    prismaMock.aperturaCaja.findFirst.mockResolvedValue(null);

    const result = await crearVenta(buildVentaInput());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("abrir caja");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("clienteId que no existe → 'Cliente no encontrado'", async () => {
    prismaMock.cliente.findUnique.mockResolvedValue(null);

    const result = await crearVenta(buildVentaInput({ clienteId: 999 }));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toContain("Cliente no encontrado");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });

  test("monto recibido < efectivo declarado → rechaza", async () => {
    const result = await crearVenta(
      buildVentaInput({
        pagos: [{ metodo: "EFECTIVO", monto: 5950 }],
        montoRecibido: 5000, // recibió 5k pero el efectivo del split es 5950
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("test contract: ok=false expected");
    expect(result.error).toMatch(/recibido.*menor/i);
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
  });
});
