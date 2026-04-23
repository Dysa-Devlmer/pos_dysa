import { create } from "zustand";
import { calcularIVA } from "@repo/domain";
import type { Producto } from "@repo/api-client";

/**
 * Cart store — Zustand slice para el POS móvil (M4).
 *
 * Mantiene en memoria el carrito activo de una transacción de caja:
 * ítems (producto + cantidad), descuento opcional (pct O monto fijo,
 * nunca ambos a la vez), y totales derivados.
 *
 * Diseño:
 * - Mantenemos cada ítem con `producto` completo (no solo id) para evitar
 *   queries al render. El tradeoff es que si el precio cambia en BD, el
 *   carrito mantiene el precio al momento de agregar — que es lo correcto
 *   para POS (el cliente vio ese precio en pantalla).
 * - Subtotal, impuesto y total son DERIVED via selector, no stored —
 *   evita drift entre ítems y totales.
 * - Descuento: solo uno de {pct, monto} activo. Aplicar monto reseta pct
 *   y viceversa. Descuento en M4 se aplica sobre subtotal; el server
 *   todavía no lo soporta (M6+), así que no se envía en el POST.
 *
 * Todos los montos Int CLP, sin decimales. calcularIVA() de @repo/domain
 * usa Math.round — misma fuente de verdad que web.
 */

export type CartItem = {
  producto: Producto;
  cantidad: number;
};

export type CartTotales = {
  subtotal: number;
  descuento: number; // monto aplicado, no pct
  baseImponible: number; // subtotal - descuento
  impuesto: number;
  total: number;
};

type CartState = {
  items: CartItem[];
  descuentoPct: number | null;
  descuentoMonto: number | null;

  addItem: (producto: Producto, cantidad?: number) => void;
  removeItem: (productoId: number) => void;
  updateQty: (productoId: number, cantidad: number) => void;
  applyDiscountPct: (pct: number | null) => void;
  applyDiscountMonto: (monto: number | null) => void;
  clearCart: () => void;

  getTotales: () => CartTotales;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  descuentoPct: null,
  descuentoMonto: null,

  /**
   * Agrega producto al carrito. Si ya existe, incrementa cantidad.
   * No valida stock acá — la validación final la hace el server al crear
   * la venta (evita race conditions entre varios dispositivos).
   */
  addItem: (producto, cantidad = 1) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.producto.id === producto.id,
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.producto.id === producto.id
              ? { ...i, cantidad: i.cantidad + cantidad }
              : i,
          ),
        };
      }
      return {
        items: [...state.items, { producto, cantidad }],
      };
    });
  },

  removeItem: (productoId) => {
    set((state) => ({
      items: state.items.filter((i) => i.producto.id !== productoId),
    }));
  },

  /**
   * Ajusta cantidad. Si cantidad <= 0 → elimina el ítem (evita ítems
   * fantasma con cantidad 0 o negativa).
   */
  updateQty: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(productoId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.producto.id === productoId ? { ...i, cantidad } : i,
      ),
    }));
  },

  applyDiscountPct: (pct) => {
    set({
      descuentoPct: pct,
      descuentoMonto: null,
    });
  },

  applyDiscountMonto: (monto) => {
    set({
      descuentoMonto: monto,
      descuentoPct: null,
    });
  },

  clearCart: () => {
    set({ items: [], descuentoPct: null, descuentoMonto: null });
  },

  getTotales: () => {
    const { items, descuentoPct, descuentoMonto } = get();
    const subtotal = items.reduce(
      (acc, i) => acc + i.producto.precio * i.cantidad,
      0,
    );

    let descuento = 0;
    if (descuentoPct != null && descuentoPct > 0) {
      // Redondear al int más cercano — consistente con IVA
      descuento = Math.round(subtotal * (descuentoPct / 100));
    } else if (descuentoMonto != null && descuentoMonto > 0) {
      descuento = Math.min(descuentoMonto, subtotal);
    }

    const baseImponible = Math.max(0, subtotal - descuento);
    const { impuesto, total } = calcularIVA(baseImponible);

    return { subtotal, descuento, baseImponible, impuesto, total };
  },
}));

/**
 * Helper: suma la cantidad de ítems del carrito (útil para el badge del
 * botón "Cobrar" y tab icon).
 */
export const selectCartCount = (state: CartState): number =>
  state.items.reduce((acc, i) => acc + i.cantidad, 0);
