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
  // F-9 split tender (commit 60d5dd9 + migration 20260426010000):
  // cuando una venta combina ≥2 métodos, Prisma persiste `metodoPago = MIXTO`
  // en la tabla raíz y el detalle queda en `Pago[]`. Sin este valor en el
  // enum, GET /api/v1/ventas crashea en mobile al hacer .parse() porque zod
  // rechaza el string MIXTO devuelto por el server. Identificado en CCC audit
  // 2026-04-28 (CV1, reporte.md adenda V).
  "MIXTO",
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
  publicToken: z.string().optional(),
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
 * Pago individual dentro de una venta — F-9 split tender.
 *
 * Replica `PagoSchema` del server (`apps/web/app/api/v1/ventas/route.ts:73`)
 * sin el refine MIXTO: el server valida que un pago individual no sea
 * MIXTO (porque MIXTO solo aplica al rollup de la venta), pero acá lo
 * dejamos al runtime del server para no duplicar lógica que pueda
 * desincronizarse. El cliente mobile debería usar valores puros
 * (EFECTIVO/DEBITO/CREDITO/TRANSFERENCIA) al construir Pago[].
 *
 * CV2 — agregado 2026-04-28 (audit Claude Code CLI).
 */
export const PagoSchema = z.object({
  metodo: MetodoPagoSchema,
  monto: z.number().int().positive(),
  referencia: z.string().max(100).optional(),
});
export type Pago = z.infer<typeof PagoSchema>;

/**
 * Body para POST /api/v1/ventas.
 *
 * OJO — el server espera `items` (no `detalles`). El field `detalles` solo
 * existe en el response (VentaSchema). Este schema está alineado con el
 * handler real en apps/web/app/api/v1/ventas/route.ts.
 *
 * F-9 split tender (commit 60d5dd9, audit 2026-04-26):
 * - Si la venta tiene un solo método, el cliente puede mandar
 *   `metodoPago: "EFECTIVO"` (legacy single-payment, mobile pre-F9).
 * - Si la venta tiene ≥2 métodos, el cliente DEBE mandar `pagos: [...]`
 *   con la lista detallada. El server calcula `metodoPago` rollup
 *   (= método único o MIXTO si hay >1).
 * - `montoRecibido` es opcional, solo aplica al componente EFECTIVO
 *   del split tender. Si se omite, server lo computa automáticamente
 *   desde la suma de pagos en efectivo.
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
  // metodoPago legacy: si NO viene `pagos`, se usa para compat single-payment.
  metodoPago: MetodoPagoSchema.optional(),
  // CV2 (split tender): array de pagos cuando la venta combina ≥2 métodos.
  pagos: z.array(PagoSchema).min(1).optional(),
  // CV3: monto efectivo recibido. El server computa `vuelto = recibido -
  // sumaEfectivo` (-1 si negativo). Solo sentido si hay pago EFECTIVO.
  montoRecibido: z.number().int().min(0).optional(),
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
  publicToken: z.string().optional(),
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

/**
 * Bloque 6 (sesión 2026-04-30) — payload PUT /api/v1/clientes/[id].
 * El RUT no se permite editar (es identificador único + integridad
 * histórica de ventas asociadas). Resto de campos son opcionales en
 * el sentido HTTP PUT-as-PATCH: los que vengan se actualizan, los
 * ausentes quedan iguales.
 */
export const ActualizarClienteRequestSchema = z.object({
  nombre: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
});
export type ActualizarClienteRequest = z.infer<
  typeof ActualizarClienteRequestSchema
>;

/**
 * Bloque 6 — payload PUT /api/v1/usuarios/me. El email NO se edita
 * (es el identificador de login + token JWT subject). Avatar es data
 * URL base64 (gotcha 13) — mobile NO lo expone en este sprint.
 */
export const ActualizarUsuarioMeRequestSchema = z.object({
  nombre: z.string().min(1).max(200),
});
export type ActualizarUsuarioMeRequest = z.infer<
  typeof ActualizarUsuarioMeRequestSchema
>;

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
  publicToken: z.string().optional(),
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

// ─── Fase 2B-P1 — Schemas faltantes (API contract completion) ───────────────

/**
 * Body para `POST /api/v1/productos`. Espejo del CreateSchema del handler
 * (`apps/web/app/api/v1/productos/route.ts:47`). Caps explícitos a INT4
 * Postgres documentados en DV2 (audit 2026-04-25).
 */
export const CrearProductoRequestSchema = z.object({
  nombre: z.string().min(1).max(200).trim(),
  descripcion: z.string().optional(),
  codigoBarras: z.string().min(1).trim(),
  precio: z.number().int().positive().max(99_999_999),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  categoriaId: z.number().int().positive(),
});
export type CrearProductoRequest = z.infer<typeof CrearProductoRequestSchema>;

/**
 * Body para `PUT /api/v1/productos/[id]`. Todos los campos opcionales —
 * el handler corre prisma.update con los que vengan. `activo: false` es
 * el equivalente de "desactivar" (el DELETE hace lo mismo internamente
 * para preservar histórico).
 */
export const ActualizarProductoRequestSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().optional(),
  codigoBarras: z.string().min(1).optional(),
  precio: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  categoriaId: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});
export type ActualizarProductoRequest = z.infer<
  typeof ActualizarProductoRequestSchema
>;

/**
 * Response de `GET /api/v1/categorias`. El handler retorna el array
 * directo sin paginación (universo SMB <50 filas). `_count.productos`
 * presente cuando el handler hace `include: { _count: ... }`.
 */
export const CategoriasListResponseSchema = z.object({
  data: z.array(CategoriaSchema),
});
export type CategoriasListResponse = z.infer<
  typeof CategoriasListResponseSchema
>;

/**
 * Response de `GET /api/v1/usuarios` (ADMIN-only listado read-only).
 * El handler hace `select` explícito que omite `password` — el schema
 * NO debe incluir password ni siquiera como opcional (defensa en
 * profundidad: Zod fail si un cambio futuro lo expone accidentalmente).
 */
export const UsuariosListResponseSchema = z.object({
  data: z.array(UsuarioSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
      totalPages: z.number().int().optional(),
    })
    .optional(),
});
export type UsuariosListResponse = z.infer<typeof UsuariosListResponseSchema>;

/**
 * Estado de una apertura de caja en runtime. Espejo del modelo Prisma
 * `AperturaCaja` con joins típicos del API: `caja: { id, nombre, ubicacion }`.
 *
 * Nota: el server emite `fechaApertura/fechaCierre` como string ISO
 * (Prisma → JSON.stringify → string). Si en el futuro mobile necesita
 * trabajar con fechas tipadas, hacer la conversión en el caller — no
 * hardcodear `z.coerce.date()` aquí porque rompe `JSON.stringify`
 * round-trip en sync queue.
 */
export const EstadoAperturaSchema = z.enum(["ABIERTA", "CERRADA"]);
export type EstadoApertura = z.infer<typeof EstadoAperturaSchema>;

export const AperturaCajaSchema = z.object({
  id: z.number().int(),
  cajaId: z.number().int(),
  usuarioId: z.number().int(),
  montoInicial: z.number().int(),
  fechaApertura: z.string(),
  fechaCierre: z.string().nullable(),
  montoFinalDeclarado: z.number().int().nullable(),
  montoFinalSistema: z.number().int().nullable(),
  diferencia: z.number().int().nullable(),
  observaciones: z.string().nullable(),
  estado: EstadoAperturaSchema,
  caja: z
    .object({
      id: z.number().int(),
      nombre: z.string(),
      ubicacion: z.string().nullable().optional(),
    })
    .optional(),
});
export type AperturaCaja = z.infer<typeof AperturaCajaSchema>;

/**
 * Tipos de movimientos de caja. Reflejan el enum `TipoMovimientoCaja`
 * de Prisma. Si el enum cambia en DB, este schema DEBE actualizarse.
 */
export const TipoMovimientoCajaSchema = z.enum([
  "INGRESO",
  "EGRESO",
  "RETIRO",
  "AJUSTE",
]);
export type TipoMovimientoCaja = z.infer<typeof TipoMovimientoCajaSchema>;

/**
 * Movimiento de caja persistido. `monto` es CLP entero (positivo o
 * negativo según semántica del cierre Z). Soft-delete via deletedAt;
 * el response default filtra `deletedAt = null` pero exponemos el
 * campo por completitud (auditoría).
 */
export const MovimientoCajaSchema = z.object({
  id: z.number().int(),
  aperturaId: z.number().int(),
  tipo: TipoMovimientoCajaSchema,
  monto: z.number().int(),
  motivo: z.string(),
  usuarioId: z.number().int(),
  fecha: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type MovimientoCaja = z.infer<typeof MovimientoCajaSchema>;

/**
 * Body para `POST /api/v1/caja/aperturas`. Espejo del schema interno
 * del handler. La response devuelve `{ data: { id } }` (id de la
 * apertura recién creada).
 */
export const AbrirCajaRequestSchema = z.object({
  cajaId: z.number().int().positive(),
  montoInicial: z.number().int().min(0),
});
export type AbrirCajaRequest = z.infer<typeof AbrirCajaRequestSchema>;

/**
 * Body para `PATCH /api/v1/caja/aperturas/[id]` (cierre Z).
 */
export const CerrarCajaRequestSchema = z.object({
  montoFinalDeclarado: z.number().int().min(0),
  observaciones: z.string().max(500).optional(),
});
export type CerrarCajaRequest = z.infer<typeof CerrarCajaRequestSchema>;

/**
 * Body para `POST /api/v1/caja/aperturas/[id]/movimientos`.
 */
export const RegistrarMovimientoRequestSchema = z.object({
  tipo: TipoMovimientoCajaSchema,
  monto: z.number().int(),
  motivo: z.string().min(1).max(255),
});
export type RegistrarMovimientoRequest = z.infer<
  typeof RegistrarMovimientoRequestSchema
>;

/**
 * Response de `GET /api/v1/devoluciones` (listado paginado). Antes
 * existía `DevolucionSchema` individual pero no el envelope de lista.
 * Cierra el contrato para que mobile/integraciones consuman tipados.
 */
export const DevolucionListResponseSchema = z.object({
  data: z.array(DevolucionSchema),
  meta: z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int().optional(),
      totalPages: z.number().int().optional(),
    })
    .optional(),
});
export type DevolucionListResponse = z.infer<
  typeof DevolucionListResponseSchema
>;
