import { z } from "zod";

/**
 * Zod schemas de la API REST v1.
 * Fuente de verdad compartida entre web (handlers en /api/v1/*) y
 * mobile (client calls). Cualquier cambio del contract DEBE tocar
 * este archivo y ambos consumers simultáneamente.
 *
 * Referencia: https://dy-pos.zgamersa.com/api/docs (Scalar UI)
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export const RolSchema = z.enum(["ADMIN", "CAJERO", "VENDEDOR"]);
export type Rol = z.infer<typeof RolSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    nombre: z.string(),
    rol: RolSchema,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ─── Errores ────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── Productos ──────────────────────────────────────────────────────────────

export const ProductoSchema = z.object({
  id: z.number().int(),
  codigo: z.string().nullable(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  precio: z.number().int(), // CLP sin decimales
  stock: z.number().int(),
  stockMinimo: z.number().int(),
  activo: z.boolean(),
  categoriaId: z.number().int(),
  ventas: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Producto = z.infer<typeof ProductoSchema>;

export const ProductosListSchema = z.object({
  data: z.array(ProductoSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
    })
    .optional(),
});
export type ProductosList = z.infer<typeof ProductosListSchema>;

// ─── Clientes ───────────────────────────────────────────────────────────────

export const ClienteSchema = z.object({
  id: z.number().int(),
  rut: z.string(),
  nombre: z.string(),
  email: z.string().email().nullable(),
  telefono: z.string().nullable(),
  direccion: z.string().nullable(),
  compras: z.number().int(),
  ultimaCompra: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Cliente = z.infer<typeof ClienteSchema>;

// ─── Ventas ─────────────────────────────────────────────────────────────────

export const MetodoPagoSchema = z.enum([
  "EFECTIVO",
  "DEBITO",
  "CREDITO",
  "TRANSFERENCIA",
]);
export type MetodoPago = z.infer<typeof MetodoPagoSchema>;

export const DetalleVentaSchema = z.object({
  productoId: z.number().int(),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().int(),
  subtotal: z.number().int(),
});
export type DetalleVenta = z.infer<typeof DetalleVentaSchema>;

export const VentaSchema = z.object({
  id: z.number().int(),
  numeroBoleta: z.string(),
  fecha: z.string(),
  subtotal: z.number().int(),
  iva: z.number().int(),
  total: z.number().int(),
  descuentoPct: z.number().nullable(),
  descuentoMonto: z.number().int().nullable(),
  metodoPago: MetodoPagoSchema,
  clienteId: z.number().int().nullable(),
  detalles: z.array(DetalleVentaSchema),
});
export type Venta = z.infer<typeof VentaSchema>;

export const CrearVentaRequestSchema = z.object({
  detalles: z
    .array(
      z.object({
        productoId: z.number().int(),
        cantidad: z.number().int().min(1),
      }),
    )
    .min(1),
  metodoPago: MetodoPagoSchema,
  clienteId: z.number().int().nullable().optional(),
  descuentoPct: z.number().min(0).max(100).optional(),
  descuentoMonto: z.number().int().min(0).optional(),
});
export type CrearVentaRequest = z.infer<typeof CrearVentaRequestSchema>;

// ─── Health ─────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  database: z.string(),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
