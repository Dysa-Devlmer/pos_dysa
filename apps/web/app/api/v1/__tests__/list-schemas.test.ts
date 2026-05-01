/**
 * Schema validation tests — list responses (Fase 2B-P1).
 *
 * Estos tests no invocan handlers; verifican que los schemas compartidos
 * de listas aceptan responses representativas de los endpoints REST. Si
 * alguien cambia el shape del handler sin actualizar el schema, el test
 * falla y la regresión queda visible antes de mergear.
 *
 * Cobertura:
 *   - CategoriasListResponseSchema  (sin paginación, array directo).
 *   - UsuariosListResponseSchema    (con meta page/limit/total).
 *   - DevolucionListResponseSchema  (con meta page/limit/total).
 *   - AperturaCajaSchema            (objeto individual con join caja).
 *   - MovimientoCajaSchema          (objeto individual).
 */

import { describe, test, expect } from "vitest";

import {
  CategoriasListResponseSchema,
  UsuariosListResponseSchema,
  DevolucionListResponseSchema,
  AperturaCajaSchema,
  MovimientoCajaSchema,
} from "@repo/api-client";

describe("CategoriasListResponseSchema", () => {
  test("acepta array vacío", () => {
    const r = CategoriasListResponseSchema.safeParse({ data: [] });
    expect(r.success).toBe(true);
  });

  test("acepta categorías con _count.productos", () => {
    const r = CategoriasListResponseSchema.safeParse({
      data: [
        {
          id: 1,
          nombre: "Almacén",
          descripcion: null,
          activa: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { productos: 12 },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  test("rechaza data NO array", () => {
    const r = CategoriasListResponseSchema.safeParse({ data: {} });
    expect(r.success).toBe(false);
  });
});

describe("UsuariosListResponseSchema", () => {
  test("acepta usuarios sin password (defensa en profundidad)", () => {
    const r = UsuariosListResponseSchema.safeParse({
      data: [
        {
          id: 1,
          nombre: "Admin",
          email: "admin@dypos.cl",
          rol: "ADMIN",
          activo: true,
          avatar: null,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(r.success).toBe(true);
  });

  test("rechaza rol fuera del enum", () => {
    const r = UsuariosListResponseSchema.safeParse({
      data: [
        {
          id: 1,
          nombre: "X",
          email: "x@x.cl",
          rol: "SUPERUSER",
          avatar: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("DevolucionListResponseSchema", () => {
  test("acepta devoluciones con venta + items + usuario opcionales", () => {
    const r = DevolucionListResponseSchema.safeParse({
      data: [
        {
          id: 1,
          ventaId: 100,
          motivo: "Producto dañado",
          montoDevuelto: 5_950,
          esTotal: false,
          fecha: new Date().toISOString(),
          venta: {
            id: 100,
            numeroBoleta: "BOL-100",
            total: 5_950,
            fecha: new Date().toISOString(),
            cliente: { nombre: "Juan", rut: "12.345.678-9" },
          },
          usuario: { nombre: "Cajero", email: "cajero@dypos.cl" },
          _count: { items: 1 },
        },
      ],
      meta: { page: 1, limit: 20 },
    });
    expect(r.success).toBe(true);
  });

  test("acepta sin meta (envelope mínimo)", () => {
    const r = DevolucionListResponseSchema.safeParse({ data: [] });
    expect(r.success).toBe(true);
  });
});

describe("AperturaCajaSchema", () => {
  test("acepta apertura ABIERTA con join caja", () => {
    const r = AperturaCajaSchema.safeParse({
      id: 7,
      cajaId: 1,
      usuarioId: 1,
      montoInicial: 50_000,
      fechaApertura: new Date().toISOString(),
      fechaCierre: null,
      montoFinalDeclarado: null,
      montoFinalSistema: null,
      diferencia: null,
      observaciones: null,
      estado: "ABIERTA",
      caja: { id: 1, nombre: "Principal", ubicacion: "Mostrador" },
    });
    expect(r.success).toBe(true);
  });

  test("acepta apertura CERRADA con todos los campos numéricos", () => {
    const r = AperturaCajaSchema.safeParse({
      id: 7,
      cajaId: 1,
      usuarioId: 1,
      montoInicial: 50_000,
      fechaApertura: new Date().toISOString(),
      fechaCierre: new Date().toISOString(),
      montoFinalDeclarado: 120_000,
      montoFinalSistema: 121_000,
      diferencia: -1_000,
      observaciones: "Faltan $1k",
      estado: "CERRADA",
    });
    expect(r.success).toBe(true);
  });

  test("rechaza estado fuera del enum", () => {
    const r = AperturaCajaSchema.safeParse({
      id: 7,
      cajaId: 1,
      usuarioId: 1,
      montoInicial: 50_000,
      fechaApertura: "x",
      fechaCierre: null,
      montoFinalDeclarado: null,
      montoFinalSistema: null,
      diferencia: null,
      observaciones: null,
      estado: "PAUSADA",
    });
    expect(r.success).toBe(false);
  });
});

describe("MovimientoCajaSchema", () => {
  test("acepta los 4 tipos de movimiento", () => {
    for (const tipo of ["INGRESO", "EGRESO", "RETIRO", "AJUSTE"] as const) {
      const r = MovimientoCajaSchema.safeParse({
        id: 1,
        aperturaId: 7,
        tipo,
        monto: 10_000,
        motivo: "Refuerzo",
        usuarioId: 1,
        fecha: new Date().toISOString(),
      });
      expect(r.success).toBe(true);
    }
  });

  test("acepta deletedAt opcional (soft-delete)", () => {
    const r = MovimientoCajaSchema.safeParse({
      id: 1,
      aperturaId: 7,
      tipo: "INGRESO",
      monto: 5_000,
      motivo: "x",
      usuarioId: 1,
      fecha: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });
});
