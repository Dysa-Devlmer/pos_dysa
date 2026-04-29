# Filosofía del Módulo de Ventas — DyPos CL

> Decisión arquitectónica con impacto operacional. Lectura obligatoria
> para cualquier desarrollador que quiera modificar el módulo de ventas.

---

## 1. La regla de oro

**Una venta es INMUTABLE una vez creada.**

Implicaciones:

- ❌ El cajero NO puede editar una venta desde la app móvil.
- ❌ El cajero NO puede eliminar una venta desde la app móvil.
- ✅ El cajero PUEDE crear una **Devolución parcial o total** que ajusta
  stock y monto neto.
- ⚠️ El admin (rol ADMIN) PUEDE editar/eliminar venta desde la web,
  pero solo con razón obligatoria + audit log + notificación al equipo.

---

## 2. Por qué inmutable

### Razón #1 — Anti-fraude del cajero

Caso real documentado en literatura POS retail (Kessler, "Retail Fraud
Patterns", 2019):

> El cajero crea una venta legítima de $50.000, cobra al cliente, le
> entrega boleta. Después de que el cliente sale, edita la venta y la
> baja a $30.000. La diferencia $20.000 se la guarda. Con boleta ya
> impresa el cliente no se da cuenta. Auditoría posterior solo ve la
> venta editada $30.000.

Si el sistema NO permite editar, este vector se cierra. El cajero solo
puede hacer **devoluciones**, que dejan trail completo:

```
Venta #1234 — fecha 2026-04-29 14:30 — total $50.000
└── Devolución D-567 — fecha 2026-04-29 14:35
    │ creado_por: cajero_juan
    │ motivo: "Cliente devolvió 2 ítems, cambio de opinión"
    │ items: [Producto X cant 2 monto $20.000]
    │ monto_devuelto: $20.000
    │ es_total: false
    └── stock revertido + audit log
```

Una devolución por $20k a los 5 minutos de cobrar $50k es **muy
visible** en cualquier reporte. El cajero no puede ocultarlo.

### Razón #2 — Compliance SII (e-boleta)

Cuando la integración F-8 SII esté activa, cada venta genera una boleta
electrónica con folio único timbrado. El SII espera:

- Folio inmutable.
- Total inmutable.
- Si hay corrección → **Nota de Crédito Electrónica** (NCE), NO edición.

Permitir edición de venta post-emisión = boleta SII desincronizada =
multa Servicio Impuestos Internos (Art. 97 nº 4 Código Tributario).

El flujo de Devolución mapea 1:1 a NCE — **arquitectura SII-ready**.

### Razón #3 — Auditoría y reportes confiables

Si las ventas son mutables, los reportes históricos cambian retroactivamente.
Un reporte Z impreso a las 18:00 del lunes con total $2.500.000 puede
mostrar $2.300.000 el martes si alguien editó ventas. Esto destruye:

- Confianza del dueño en sus números.
- Reconciliación contable mensual.
- Análisis de tendencias (KPIs corruptos).
- Cierre Z (que asume snapshot inmutable).

### Razón #4 — Compliance Ley 21.719 (data retention 6 años)

Datos personales del cliente en una venta (RUT, nombre) deben ser
retenidos 6 años por ley SII. Si la venta se edita, ¿cuál versión es la
"oficial"? La inmutabilidad responde la pregunta automáticamente.

---

## 3. Workflow correcto para escenarios típicos

### Escenario A: Cliente quiere devolver 1 producto que no le gustó

**Flujo correcto** (cajero, mobile):

1. Cajero abre app DyPos CL → Tab "Más" → Devoluciones.
2. Tap "Nueva Devolución".
3. Buscar la venta original (por número de boleta o RUT cliente).
4. Seleccionar el ítem específico + cantidad a devolver.
5. Motivo: "Cliente cambió de opinión" (texto libre).
6. Confirmar.

Sistema automático:
- Stock del producto se revierte (suma de vuelta lo devuelto).
- Contador de ventas del producto se decrementa.
- Audit log con `accion: DELETE` sobre items específicos.
- Si cliente tiene ficha: `compras` permanece, pero
  `ultimaCompra` se recalcula desde el historial restante.

### Escenario B: Cajero erró al cobrar (precio o cantidad equivocada)

**Flujo correcto**:

1. **Devolución total** de la venta errónea (motivo: "Error de cajero").
2. **Crear nueva venta** con datos correctos.

Razón: simpler para auditoría que "edición". El histórico muestra:
- Venta #1234 → Devuelta total con motivo "error"
- Venta #1235 → Nueva venta correcta

Cierre Z tiene 0 confusión.

### Escenario C: Producto inexistente apareció en boleta

Caso rarísimo pero posible (cache desincronizado, bug, manipulación).

**Flujo correcto**: solo ADMIN web puede manejar esto:

1. Admin entra a `/ventas/[id]/editar` (web only).
2. Sistema pide razón obligatoria mínimo 30 caracteres.
3. Editar venta + sistema crea audit_log con:
   - `accion: UPDATE`
   - `usuario_id`: admin
   - `diff`: snapshot completo antes/después
   - `motivo`: razón provista
4. Notificación email al owner: "ADMIN editó venta #X".

### Escenario D: Venta duplicada accidentalmente

Cuando hay sync offline el riesgo es bajo (Idempotency-Key dedupe), pero
si pasa:

**Flujo correcto**: ADMIN web → `/ventas/[id]/eliminar` con razón.
Soft-delete (no hard delete) → la venta queda visible en
`/ventas/eliminadas` con razón + auditoría.

---

## 4. Por qué NO copiar el flujo de Bsale (que sí permite editar)

Bsale permite editar ventas con permiso. Aparenta simplificar la vida
pero introduce:

- Vector de fraude documentado (ver Razón #1).
- Inconsistencia con SII (cuando incorporen e-boleta).
- Reportes mutables (los dueños se quejan).

DyPos CL **NO copia ese error**. Filosofía clara desde el día 1.

---

## 5. Excepciones controladas (web admin)

Solo el rol `ADMIN` puede:

- Editar venta **antes de generar boleta SII** (cuando no hay folio).
- Editar venta para corregir **datos no fiscales** (notas internas, tags).
- Eliminar venta (soft-delete) con motivo + audit log.
- Restaurar venta eliminada.

**Roles `CAJERO` y `VENDEDOR`**: capacidades limitadas a crear venta
+ crear devolución. No edición, no eliminación.

---

## 6. Implementación actual (verificada 2026-04-29)

### En código

- ✅ `apps/mobile/app/(tabs)/ventas/[id].tsx` muestra detalle, NO tiene
  botón editar.
- ✅ `apps/mobile/app/(tabs)/mas/devoluciones/nueva.tsx` permite crear
  devolución parcial/total.
- ✅ `apps/web/app/(dashboard)/ventas/[id]/editar/page.tsx` requiere
  rol ADMIN + razón obligatoria.
- ✅ `eliminarVenta` server action escribe `audit_log` con `accion: DELETE`
  + razón.

### En documentación

- Esta filosofía debe aparecer en:
  - Onboarding video (cuando exista).
  - Docs cliente (`docs/cliente/`).
  - Términos del contrato (anexo: "DyPos CL no permite edición de
    ventas como medida anti-fraude").

---

## 7. ¿Qué decirle al cliente que pregunte por qué no puede editar?

Script de respuesta sugerido (para Pierre y eventual equipo soporte):

> "DyPos CL trata cada venta como un comprobante fiscal: una vez emitida,
> es definitiva. Esto te protege a vos y a tu negocio de errores y fraudes
> internos. Si necesitás corregir, usá el botón Devolución — funciona
> igual de rápido pero deja constancia clara de quién, cuándo y por qué.
> Es la misma filosofía que usan los bancos con las transferencias: no se
> editan, se reversan."

---

## 8. Para casos edge

Si un cliente insiste en que necesita "editar venta" desde mobile (típico
si vienen de Bsale), responder:

1. Preguntar **qué problema real está resolviendo**. 90% de las veces es
   un workflow que se cubre con devolución.
2. Si el caso es legítimo y recurrente → considerar como **Feature Request**
   priorizado. Decisión: implementar con MULTI-FACTOR control:
   - Solo ADMIN puede iniciar.
   - Confirmación 2-step (PIN admin).
   - Notificación email instantánea al owner.
   - Log inmutable con before/after.
3. **Nunca** flexibilizar para "comodidad" — la rigidez es el feature.

---

> Esta filosofía es **estructural**. Modificarla requiere ADR nuevo +
> aprobación explícita del owner Pierre Benites Solier.
