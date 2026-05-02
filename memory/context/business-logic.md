---
title: Business Logic — Ventas, IVA, RUT, Boletas, Descuentos, Devoluciones
tags:
  - business-logic
  - chile
  - ventas
  - contabilidad
  - contexto
aliases:
  - Business Rules
  - Lógica de Negocio
---

# Business Logic — Ventas, IVA, RUT, Boletas, Descuentos, Devoluciones

Reglas de dominio específicas de [[pos-chile-monorepo]]. Todo lo que hace que este sistema sea un POS chileno y no genérico.

Relacionado: [[pos-chile-monorepo]] · [[auth-patterns]] · [[stack-tech]] · [[security-owasp]]

> [!info] Principio sagrado
> Toda operación que toca inventario **SIEMPRE** va en `prisma.$transaction`. El `crearVenta`/`editarVenta`/`eliminarVenta`/`crearDevolucion` no pueden dejar estados intermedios si algo falla.

## 1. Moneda — CLP como `Int`

Chile no tiene decimales en pesos. La columna `precio` en Prisma es `Int` (no `Decimal`, no `Float`).

```prisma
model Producto {
  precio  Int  // CLP sin decimales
  stock   Int
  ventas  Int @default(0)  // contador acumulado
}
```

**Display**: `formatCLP()` en `apps/web/lib/utils.ts`:

```ts
export function formatCLP(valor: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  })
    .format(valor)
    .replace(/[\u202f\u00a0]/g, " "); // GAP G3 — evita hydration mismatch
}
```

> [!danger] Hydration mismatch bug (G3)
> Node 20+ devuelve `Intl.NumberFormat` con caracteres no-breaking space (`\u00a0`) y narrow no-break space (`\u202f`). El browser a veces los convierte en `\u0020`. Sin el `.replace`, SSR y cliente divergen → React emite warning `Text content did not match`. **Siempre normalizar**.

## 2. IVA — 19% fijo

Chile: IVA = 19% desde 1988, no cambia. Hardcoded, no configurable.

```ts
// apps/web/lib/utils.ts
export const IVA_RATE = 0.19;

export function calcularIVA(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE);
}

export function calcularTotal(subtotal: number): number {
  return subtotal + calcularIVA(subtotal);
}
```

> [!warning] Redondeo
> Usar `Math.round` (no `Math.floor` ni `Math.ceil`). La ley chilena permite cualquier criterio de redondeo consistente pero estándar de facto es `round`. Bug común: acumular `Math.floor` en 100 líneas pierde cientos de pesos.

## 3. RUT — Validación módulo 11

RUT chileno: "12.345.678-9". Dígito verificador calculado con algoritmo módulo 11.

```ts
// apps/web/lib/utils.ts
export function validarRUT(rut: string): boolean {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

export function formatRUT(rut: string): string {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFmt}-${dv}`;
}
```

**Almacenamiento**: siempre formateado en DB (`String` con puntos y guión). Razón: humanamente legible al hacer queries ad-hoc, y las comparaciones `.includes(query)` funcionan para búsquedas.

**Tests**: 20 tests en `lib/__tests__/utils.test.ts` cubren casos válidos (RUT real `11.111.111-1`, DV K, etc.) e inválidos (checksum malo, formato malo, vacío).

## 4. Boleta — formato nanoid

Número único generado con `nanoid` en formato `B-YYYYMMDD-XXXXXXXX`:

```ts
import { customAlphabet } from "nanoid";
const nano = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export function generarNumeroBoleta(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `B-${y}${m}${d}-${nano()}`;
}
```

Ejemplo: `B-20260419-A7K3M2PX`.

- **Unicidad**: columna `numeroBoleta` es `@unique` en Prisma. Si nanoid colisiona (improbable pero posible), el `INSERT` falla y el `$transaction` se aborta.
- **No es SII**: este no es un folio electrónico ante el SII, es un identificador interno. Integración SII electrónico es fase futura.

### 4.2. Comprobantes públicos compartibles — Fase 3C.1

Las ventas y devoluciones tienen un token público dedicado:

```prisma
Venta.publicToken      String @unique @map("public_token")
Devolucion.publicToken String @unique @map("public_token")
```

Reglas:

- `numeroBoleta` sigue siendo referencia humana interna, NO llave pública.
- El link público usa `/comprobante/[token]` o
  `/comprobante/devolucion/[token]`.
- Los links no requieren auth, pero tienen `noindex,nofollow`.
- Venta/devolución con `deletedAt != null` responde 404 silencioso.
- El comprobante público refleja estado vivo, no snapshot histórico.
- PII siempre enmascarada: nombre abreviado (`Pierre B.`) y RUT
  protegido (`12.***.***-9`).
- Nunca exponer en comprobante público: email, teléfono, dirección,
  usuario/cajero, IDs internos o datos administrativos.

UI:

- Web: `navigator.share` → fallback clipboard → fallback `wa.me`.
- Mobile: React Native `Share.share`.
- Texto oficial: **Comprobante interno**. No usar "Boleta Electrónica"
  hasta integrar SII F-8.

### 4.1. Impresión de boleta — ventana autónoma (commit `2fa2477` + `3fdefe9`)

El approach original con `@media print` sobre el `<BoletaModal />` de Radix falló por incompatibilidad con portal + framer-motion transforms. Pattern canónico ahora:

```ts
// caja/boleta-modal.tsx::handlePrint
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function handlePrint() {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>Boleta ${esc(numeroBoleta)}</title>
    <style>
      * { print-color-adjust: exact; -webkit-print-color-adjust: exact; color: #000; font-weight: 500; }
      @page { size: auto; margin: 0 }
      @media print and (max-width: 90mm) { body { padding: 3mm } }   /* térmica 58/80mm */
      @media print and (min-width: 150mm) { body { max-width: 80mm; margin: 0 auto } }  /* A4/Letter */
      body { font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; line-height: 1.45 }
      .monto { font-variant-numeric: tabular-nums }
      .total-box { border-top: 3px double #000; border-bottom: 3px double #000; padding: 4px 0 }
      /* ... */
    </style>
  </head><body>
    <!-- estructura con esc() en TODO string de datos -->
  </body></html>`);
  w.document.close();
  w.print();
  w.close();
}
```

**Claves del diseño**:
- **HTML+CSS autónomo** — cero dependencias de Tailwind, React, o el árbol DOM actual. Portable cross-browser, cross-impresora
- **`print-color-adjust: exact`** — obliga a imprimir colores exactos; sin esto, browsers optimizan grises y la boleta sale borrosa en impresoras B&W
- **`color: #000` + `font-weight: 500` global** — contraste máximo para tintas débiles
- **`font-variant-numeric: tabular-nums`** en montos — alinea columnas de precios sin fuentes mono raras
- **Media queries por ancho de papel** — 58/80mm térmica vs A4/Letter detectadas por el browser según la impresora elegida
- **`esc()` en TODO string de BD** — `document.write` NO auto-escapa → vector XSS si un nombre/RUT contiene `<script>`. La función esc mapea `& < > " '` a entidades HTML
- **`@page { size: auto; margin: 0 }`** — margen cero evita que el browser añada headers/footers (fecha, URL) de navegador

Eliminado el bloque `@media print` antes necesario en `globals.css` (commit `e005238` obsoleto, ver gotcha 39).

## 5. Crear venta — transacción completa

`apps/web/app/(dashboard)/ventas/actions.ts::crearVenta`:

```ts
await prisma.$transaction(async (tx) => {
  // 1. Validar stock ANTES de tocar nada
  for (const item of carrito) {
    const producto = await tx.producto.findUniqueOrThrow({ where: { id: item.productoId } });
    if (producto.stock < item.cantidad) {
      throw new Error(`Stock insuficiente para ${producto.nombre}`);
    }
  }

  // 2. Crear venta + detalles
  const venta = await tx.venta.create({
    data: {
      numeroBoleta: generarNumeroBoleta(),
      subtotal, iva, total, metodoPago, clienteId,
      detalles: { create: carrito.map(c => ({ ... })) },
    },
  });

  // 3. Decrementar stock + incrementar contador de ventas producto
  for (const item of carrito) {
    await tx.producto.update({
      where: { id: item.productoId },
      data: {
        stock:  { decrement: item.cantidad },
        ventas: { increment: item.cantidad },  // contador acumulado
      },
    });
  }

  // 4. Si hay cliente: incrementar compras + ultimaCompra = now()
  if (clienteId) {
    await tx.cliente.update({
      where: { id: clienteId },
      data: {
        compras: { increment: 1 },
        ultimaCompra: venta.fecha,
      },
    });
  }

  return venta;
});
```

## 6. Eliminar venta — reversión exacta

```ts
await prisma.$transaction(async (tx) => {
  const venta = await tx.venta.findUniqueOrThrow({
    where: { id },
    include: { detalles: true },
  });

  // 1. Revertir stock + contadores
  for (const detalle of venta.detalles) {
    await tx.producto.update({
      where: { id: detalle.productoId },
      data: {
        stock:  { increment: detalle.cantidad },
        ventas: { decrement: detalle.cantidad },
      },
    });
  }

  // 2. Cliente: decrementar + recalcular ultimaCompra
  if (venta.clienteId) {
    const ventasRestantes = await tx.venta.findMany({
      where: { clienteId: venta.clienteId, id: { not: venta.id } },
      orderBy: { fecha: "desc" },
      take: 1,
    });
    await tx.cliente.update({
      where: { id: venta.clienteId },
      data: {
        compras: { decrement: 1 },
        ultimaCompra: ventasRestantes[0]?.fecha ?? null,
      },
    });
  }

  // 3. Eliminar venta (detalles cascade)
  await tx.venta.delete({ where: { id } });
});
```

> [!danger] `ultimaCompra` NO es "la anterior"
> Al eliminar una venta, NO se puede asumir que `ultimaCompra = la venta anterior de este cliente`. Hay que **recalcular desde historial completo** con `findMany + orderBy fecha desc + take 1`. Si el cliente solo tenía esa venta → `ultimaCompra = null`.

## 7. Editar venta — revert + re-apply

```ts
// Pseudo-código: editarVenta = eliminar + crear en la misma transacción
await prisma.$transaction(async (tx) => {
  // 1. Revertir todos los efectos de la venta vieja
  //    (stock += detalles.cantidad, ventas -= cantidad, compras -= 1, ultimaCompra recalc)
  // 2. Aplicar todos los efectos de la nueva venta
  //    (stock -= nuevosCantidad, ventas += nuevosCantidad, compras += 1, ultimaCompra = fecha)
  // 3. Validar stock efectivo = stock_actual + devolución_vieja >= nueva_cantidad
});
```

**Stock efectivo** al editar: si la venta vieja tenía 5 Producto-A y queda stock 2, puedo editar a 7 Producto-A porque 2 + 5 devolución = 7. La validación debe contemplar esto.

> [!danger] Editar venta con devoluciones está PROHIBIDO
> Si `venta.devoluciones.length > 0`, **no se puede editar** — `Devolucion` ya consumió `DetalleVenta` y ajustó stock por su cuenta; revertir + re-aplicar produciría stock duplicado/negativo y `compras`/`ultimaCompra` corruptos. Defensa en 3 capas (commit `7d118be`):
> 1. **UI** (`ventas/[id]/page.tsx`): botón "Editar" `disabled` con `title` explicativo si hay devoluciones.
> 2. **Page guard** (`ventas/[id]/editar/page.tsx`): `prisma.devolucion.count` post-`notFound` → `redirect(/ventas/${id})`.
> 3. **Server action** (`editarVenta` en `ventas/actions.ts`): pre-check `count` después de cargar `ventaVieja` → retorna `{ ok: false, error: "...elimina primero las devoluciones" }`.
>
> Mismo patrón ya existía para `eliminarVenta` (FK constraint). El flujo correcto si hay que "editar" es: eliminar devolución(es) → editar venta → re-crear devolución si aplica.

## 8. Descuentos (Fase 11)

Dos tipos soportados: **porcentaje** (0-100) y **monto fijo** (Int CLP). Se aplican al subtotal ANTES del IVA.

```ts
// apps/web/lib/calcular-desglose.ts
export function calcularDesglose({
  subtotal,
  descuentoTipo,   // "porcentaje" | "monto" | null
  descuentoValor,  // number
}: Args): Desglose {
  let montoDescuento = 0;
  if (descuentoTipo === "porcentaje") {
    montoDescuento = Math.round(subtotal * (descuentoValor / 100));
  } else if (descuentoTipo === "monto") {
    montoDescuento = Math.min(descuentoValor, subtotal); // capar a subtotal
  }
  const subtotalConDescuento = subtotal - montoDescuento;
  const iva = calcularIVA(subtotalConDescuento);
  const total = subtotalConDescuento + iva;
  return { subtotal, montoDescuento, subtotalConDescuento, iva, total };
}
```

**Casos edge cubiertos** (9 tests en `calcular-desglose.test.ts`):
- Descuento 0% → `montoDescuento = 0`
- Descuento 100% → `total = 0`
- Descuento monto > subtotal → cap a subtotal (no negativo)
- Descuento null → pass-through

> [!warning] IVA sobre subtotal CON descuento, no antes
> Chile: el IVA se calcula sobre la base imponible, que es subtotal menos descuentos. Calcular IVA primero y luego descontar deja al fisco de menos.

## 9. Devoluciones (Fase 12)

Dos modalidades:
- **Total**: elimina la venta completa (pipeline de `eliminarVenta`).
- **Parcial**: devuelve N unidades de un detalle específico, actualiza cantidades y totales de la venta.

```ts
// apps/web/app/(dashboard)/devoluciones/actions.ts::crearDevolucion
await prisma.$transaction(async (tx) => {
  // G2 FIX — lock pesimista primera op
  await tx.$executeRaw`SELECT id FROM ventas WHERE id = ${ventaId} FOR UPDATE NOWAIT`;

  const venta = await tx.venta.findUniqueOrThrow({
    where: { id: ventaId },
    include: { detalles: { include: { producto: true } } },
  });

  // Revertir stock y contadores por cada item devuelto
  for (const devolucion of devoluciones) {
    await tx.producto.update({
      where: { id: devolucion.productoId },
      data: {
        stock:  { increment: devolucion.cantidad },
        ventas: { decrement: devolucion.cantidad },
      },
    });
    // Actualizar detalleVenta.cantidad (o eliminarlo si queda en 0)
    // Recalcular venta.subtotal, venta.iva, venta.total
  }

  // Registrar en tabla devoluciones
  await tx.devolucion.create({ data: { ventaId, motivo, items, ... } });
});
```

> [!danger] `FOR UPDATE NOWAIT` — por qué primera op
> Dos devoluciones concurrentes de la misma venta podrían leer el mismo snapshot y aplicar reversión doble. `FOR UPDATE NOWAIT` bloquea la fila inmediatamente; si otro tx ya tiene el lock, falla rápido (`ERROR: could not obtain lock on row`) en vez de colgarse. El usuario ve "intenta de nuevo" en vez de timeout.

## 10. Alertas de stock bajo (Fase 10)

Un producto está "en alerta" si `stock <= stockMinimo`. Tres puntos de visibilidad:
- **Badge en Sidebar** con contador (server component refresca cada navegación)
- **Banner en Dashboard** con top 5 productos en alerta
- **Panel dedicado** `/alertas` con tabla completa + server action para marcar como "notificado"

Query usada (en `app/(dashboard)/alertas/actions.ts`):

```ts
await prisma.producto.findMany({
  where: {
    activo: true,
    stock: { lte: prisma.raw("stock_minimo") }, // comparación columna-columna
  },
  orderBy: { stock: "asc" },
});
```

Como Prisma no soporta comparaciones columna-columna en `where` nativo, a veces se usa `$queryRaw`:

```ts
const productos = await prisma.$queryRaw<Array<{...}>>`
  SELECT id, nombre, stock, stock_minimo
  FROM productos
  WHERE activo = true AND stock <= stock_minimo
  ORDER BY stock ASC
`;
```

> [!info] G5 falso positivo
> Gemini reportó `$queryRaw` como SQL injection risk. Falso positivo: es template literal parametrizado, Prisma escapa los `${}` interpolados. Solo sería injection con concatenación de strings (`"... WHERE id = " + userInput`), lo cual no se usa.

## Tabla resumen — helpers de `lib/utils.ts`

| Función | Input | Output | Tests |
|---------|-------|--------|-------|
| `formatCLP(n)` | `number` | `"$1.234"` | 6 |
| `calcularIVA(sub)` | `number` | `number` (19%) | 3 |
| `validarRUT(rut)` | `string` | `boolean` | 7 |
| `formatRUT(rut)` | `string` | `"12.345.678-9"` | 4 |
| `calcularDesglose(args)` | `Args` | `Desglose` | 9 |

**Total tests de lógica de negocio**: 29 (de 57 suite completa).

## Lista de enums

```prisma
enum Rol { ADMIN CAJERO VENDEDOR }
enum MetodoPago { EFECTIVO DEBITO CREDITO TRANSFERENCIA }
enum EstadoVenta { COMPLETADA ANULADA }  // si se añade en el futuro
```

## Timezone — America/Santiago

- Container PostgreSQL: `PGTZ=America/Santiago`
- Container app: `TZ=America/Santiago` en `docker-compose.yml`
- Prisma DateTime: UTC en DB, el servidor renderiza con TZ Chile

Ver [[infra-docker]] para detalle de variables de entorno timezone.
