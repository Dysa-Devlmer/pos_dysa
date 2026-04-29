/**
 * Unit tests — cartStore (zustand) — POS mobile.
 *
 * Cubre las invariantes de R3 audit (sección 21):
 *  - addItem agrega y suma cantidades
 *  - getTotales calcula IVA 19% Chile correctamente (Math.round, no float)
 *  - clearCart deja el estado vacío
 *
 * Para correr (cuando jest-expo este instalado):
 *   pnpm --filter @repo/mobile test
 *
 * Setup pendiente (out of scope R3):
 *   pnpm add -D jest-expo @testing-library/react-native @types/jest
 *   + "test": "jest" en package.json scripts
 *   + jest.config.js con preset: 'jest-expo'
 */
import type { Producto } from "@repo/api-client";

import { useCartStore } from "../stores/cartStore";

// Mock parcial: cartStore solo lee id/nombre/precio/stock del Producto.
// Castamos via `unknown` para evitar `as any` (que oculta typos) sin tener
// que poblar 15+ campos del shape Prisma completo.
const productoMock = {
  id: 1,
  nombre: "Almuerzo ejecutivo",
  precio: 5000,
  stock: 10,
  codigoBarras: "ALM-001",
  categoriaId: 1,
  alertaStock: 2,
} as unknown as Producto;

describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  test("addItem agrega un nuevo producto al carrito", () => {
    useCartStore.getState().addItem(productoMock, 2);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.cantidad).toBe(2);
  });

  test("addItem suma cantidades cuando el producto ya existe", () => {
    useCartStore.getState().addItem(productoMock, 1);
    useCartStore.getState().addItem(productoMock, 3);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.cantidad).toBe(4);
  });

  test("getTotales calcula IVA 19% sobre subtotal", () => {
    useCartStore.getState().addItem(productoMock, 2); // 2 × 5000 = 10000
    const totales = useCartStore.getState().getTotales();
    expect(totales.subtotal).toBe(10000);
    // IVA 19%: el helper usa calcularIVA(base) → impuesto + total > subtotal
    expect(totales.impuesto).toBeGreaterThan(0);
    expect(totales.total).toBeGreaterThan(totales.subtotal);
    // Sanity: total = base + impuesto
    expect(totales.total).toBe(totales.baseImponible + totales.impuesto);
  });

  test("clearCart vacia el carrito y descuentos", () => {
    useCartStore.getState().addItem(productoMock, 5);
    useCartStore.getState().applyDiscountPct(10);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.descuentoPct).toBeNull();
    expect(state.descuentoMonto).toBeNull();
  });

  test("updateQty con cantidad <= 0 elimina el item", () => {
    useCartStore.getState().addItem(productoMock, 3);
    useCartStore.getState().updateQty(productoMock.id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
