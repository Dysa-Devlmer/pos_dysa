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
  codigoBarras: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  precio: z.number().int(), // CLP sin decimales
  stock: z.number().int(),
  alertaStock: z.number().int(),
  activo: z.boolean(),
  categoriaId: z.number().int(),
  ventas: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoria: z
    .object({ id: z.number().int(), nombre: z.string() })
    .optional(),
});
export type Producto = z.infer<typeof ProductoSchema>;

export const ProductosListSchema = z.object({
  data: z.array(ProductoSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
      totalPages: z.number().int().optional(),
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

/**
 * Shape real que devuelve GET /api/v1/ventas y /api/v1/ventas/[id].
 *
 * Prisma guarda `impuesto` (no `iva`) + `descuentoPct` como Decimal(5,2) que
 * Prisma serializa como string. `descuentoMonto` es Int@default(0) — no
 * nullable. Alineamos acá lo que devuelve el server para no romper `.parse()`
 * en el cliente mobile.
 */
export const VentaSchema = z.object({
  id: z.number().int(),
  numeroBoleta: z.string(),
  fecha: z.string(),
  subtotal: z.number().int(),
  impuesto: z.number().int(),
  total: z.number().int(),
  descuentoPct: z.union([z.number(), z.string()]).optional(),
  descuentoMonto: z.number().int().optional(),
  metodoPago: MetodoPagoSchema,
  clienteId: z.number().int().nullable(),
  usuarioId: z.number().int().optional(),
  cliente: z
    .object({ id: z.number().int(), nombre: z.string(), rut: z.string() })
    .nullable()
    .optional(),
  usuario: z
    .object({ id: z.number().int(), nombre: z.string() })
    .optional(),
  detalles: z.array(
    DetalleVentaSchema.extend({
      id: z.number().int().optional(),
      ventaId: z.number().int().optional(),
      producto: z
        .object({
          id: z.number().int(),
          nombre: z.string(),
          codigoBarras: z.string().optional(),
        })
        .optional(),
    }),
  ),
});
export type Venta = z.infer<typeof VentaSchema>;

/**
 * Body para POST /api/v1/ventas.
 *
 * OJO — el server espera `items` (no `detalles`). El field `detalles` solo
 * existe en el response (VentaSchema). Este schema está alineado con el
 * handler real en apps/web/app/api/v1/ventas/route.ts.
 *
 * Descuentos: M6+ (todavía no soportado por el server).
 */
export const CrearVentaRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productoId: z.number().int(),
        cantidad: z.number().int().min(1),
      }),
    )
    .min(1),
  metodoPago: MetodoPagoSchema,
  clienteId: z.number().int().nullable().optional(),
});
export type CrearVentaRequest = z.infer<typeof CrearVentaRequestSchema>;

/**
 * Response minimal del POST /api/v1/ventas — wrappeado en { data }.
 * El handler incluye todos los campos de Prisma (detalles, numeroBoleta,
 * total, etc.); acá validamos solo lo que el mobile necesita mostrar.
 */
export const VentaCreadaSchema = z.object({
  id: z.number().int(),
  numeroBoleta: z.string(),
  subtotal: z.number().int(),
  impuesto: z.number().int(),
  total: z.number().int(),
  metodoPago: MetodoPagoSchema,
});
export type VentaCreada = z.infer<typeof VentaCreadaSchema>;

export const VentaCreadaResponseSchema = z.object({
  data: VentaCreadaSchema,
});
export type VentaCreadaResponse = z.infer<typeof VentaCreadaResponseSchema>;

// ─── Health ─────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  database: z.string(),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── Dashboard (M3 mobile) ──────────────────────────────────────────────────

export const DashboardVentaDiaSchema = z.object({
  fecha: z.string(),        // "YYYY-MM-DD" en zona Chile
  etiqueta: z.string(),     // "Lun 22" para eje del chart
  total: z.number().int(),  // CLP acumulado del día
  transacciones: z.number().int(),
});
export type DashboardVentaDia = z.infer<typeof DashboardVentaDiaSchema>;

export const DashboardStockCriticoItemSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  stock: z.number().int(),
  alertaStock: z.number().int(),
});
export type DashboardStockCriticoItem = z.infer<
  typeof DashboardStockCriticoItemSchema
>;

export const DashboardSchema = z.object({
  ventasHoy: z.object({
    total: z.number().int(),
    transacciones: z.number().int(),
  }),
  stockCritico: z.object({
    count: z.number().int(),
    productos: z.array(DashboardStockCriticoItemSchema),
  }),
  ventas7dias: z.array(DashboardVentaDiaSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const DashboardResponseSchema = z.object({
  data: DashboardSchema,
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

// ─── M6: Listados ───────────────────────────────────────────────────────────

export const VentasListResponseSchema = z.object({
  data: z.array(VentaSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
      totalPages: z.number().int().optional(),
    })
    .optional(),
});
export type VentasListResponse = z.infer<typeof VentasListResponseSchema>;

export const ClientesListResponseSchema = z.object({
  data: z.array(ClienteSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
      totalPages: z.number().int().optional(),
    })
    .optional(),
});
export type ClientesListResponse = z.infer<typeof ClientesListResponseSchema>;

export const ClienteDetalleSchema = ClienteSchema.extend({
  ventas: z
    .array(
      z.object({
        id: z.number().int(),
        numeroBoleta: z.string(),
        fecha: z.string(),
        total: z.number().int(),
        metodoPago: MetodoPagoSchema,
      }),
    )
    .optional(),
});
export type ClienteDetalle = z.infer<typeof ClienteDetalleSchema>;

export const CrearClienteRequestSchema = z.object({
  rut: z.string().min(3).max(12),
  nombre: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});
export type CrearClienteRequest = z.infer<typeof CrearClienteRequestSchema>;

export const CategoriaSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  activa: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ productos: z.number().int() }).optional(),
});
export type Categoria = z.infer<typeof CategoriaSchema>;

export const UsuarioSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  email: z.string().email(),
  rol: RolSchema,
  activo: z.boolean().optional(),
  avatar: z.string().nullable(),
  createdAt: z.string(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const DevolucionItemSchema = z.object({
  id: z.number().int().optional(),
  productoId: z.number().int(),
  cantidad: z.number().int(),
  precioUnitario: z.number().int(),
  subtotal: z.number().int(),
  producto: z
    .object({
      id: z.number().int(),
      nombre: z.string(),
      codigoBarras: z.string().optional(),
    })
    .optional(),
});
export type DevolucionItem = z.infer<typeof DevolucionItemSchema>;

export const DevolucionSchema = z.object({
  id: z.number().int(),
  ventaId: z.number().int(),
  motivo: z.string(),
  montoDevuelto: z.number().int(),
  esTotal: z.boolean(),
  fecha: z.string(),
  creadoPor: z.number().int().optional(),
  venta: z
    .object({
      id: z.number().int(),
      numeroBoleta: z.string(),
      total: z.number().int(),
      fecha: z.string(),
      cliente: z
        .object({ nombre: z.string(), rut: z.string() })
        .nullable()
        .optional(),
    })
    .optional(),
  usuario: z
    .object({ nombre: z.string(), email: z.string().email() })
    .optional(),
  items: z.array(DevolucionItemSchema).optional(),
  _count: z.object({ items: z.number().int() }).optional(),
});
export type Devolucion = z.infer<typeof DevolucionSchema>;

export const CrearDevolucionRequestSchema = z.object({
  ventaId: z.number().int().positive(),
  motivo: z.string().min(5).max(255),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidadDevolver: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type CrearDevolucionRequest = z.infer<
  typeof CrearDevolucionRequestSchema
>;

export const CambiarPasswordRequestSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(6).max(200),
});
export type CambiarPasswordRequest = z.infer<
  typeof CambiarPasswordRequestSchema
>;

export const ActualizarPerfilRequestSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().email().max(120),
  avatar: z.string().optional(),
});
export type ActualizarPerfilRequest = z.infer<
  typeof ActualizarPerfilRequestSchema
>;
