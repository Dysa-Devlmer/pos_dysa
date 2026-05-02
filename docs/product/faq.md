# Preguntas frecuentes — DyPos CL

> Respuestas rápidas a las dudas más comunes. Si no encontrás lo que
> buscás acá, escribinos al canal de soporte que te dimos al
> contratar.

---

## Sobre el producto

### ¿Qué es DyPos CL en una frase?

Un sistema de punto de venta web + app móvil para comercios
chilenos chicos y medianos.

### ¿En qué se diferencia de Bsale o Defontana?

- **Precio**: nosotros partimos en $24.990 CLP/mes. Bsale completo
  está en $50–150k, Defontana arriba de $300k.
- **App móvil offline-first**: vendés sin internet y sincroniza
  después. Bsale tiene app limitada, Defontana no tiene.
- **Despliegue dedicado**: cada cliente tiene su propia base de
  datos aislada físicamente. No compartís servidor con nadie.
- **Sin lock-in**: tu data es Postgres estándar. Si algún día te
  vas, te pasamos un dump y listo.

### ¿Funciona en Mac, Linux y Windows?

Sí. El panel web corre en cualquier navegador moderno
(recomendamos Chrome o Edge). La app móvil es solo Android por
ahora — iOS está en roadmap.

### ¿Cuántas terminales puedo conectar?

Soporta múltiples terminales conectándose al mismo servidor. El
límite práctico depende de la **infraestructura del VPS y del plan
contratado** — no hay un tope codificado, pero a más terminales en
paralelo, más recursos consume. La diferencia entre planes está
sobre todo en el volumen de **ventas mensuales** (Starter hasta
500, Pro hasta 5.000, Business sin tope práctico). Si proyectás un
escenario muy intensivo, conversémoslo antes para dimensionar el
servidor.

---

## Sobre boleta electrónica SII

### ¿Emite boleta electrónica SII?

**Hoy no.** Estamos integrando con un proveedor DTE (OpenFactura,
Haulmer, SimpleAPI o Bsale API — RFC en curso). El sprint F-8 lo
agrega y lo estimamos para **6–8 semanas calendario**.

### ¿Y mientras tanto qué hago?

DyPos CL emite **boleta interna** que sirve como comprobante para
el cliente y para tu registro contable interno. Para el SII, seguí
emitiendo por tu canal habitual (boleta manual, otro proveedor de
DTE, etc.).

### ¿Cuándo lo van a tener?

Sprint F-8, estimado en 6–8 semanas. Te avisamos antes de que
salga y te incluimos la integración sin costo si ya sos cliente.

### ¿Voy a tener que pagar más cuando salga?

No. La integración SII está **incluida** en todos los planes
(Starter, Pro, Business). Lo único extra es el costo del proveedor
DTE en sí (folios), que pasa por afuera de DyPos CL.

---

## Sobre la app móvil

### ¿Por qué no está en Google Play?

Porque cada cliente tiene **su propia APK con su marca**. Subir
N apps a Play Store es operativamente complejo y caro. La
distribución directa por archivo `.apk` es más simple, gratis y
permite tu branding propio.

### ¿Cómo actualizo la app cuando salga una versión nueva?

El ADMIN te pasa la APK nueva (igual que la primera vez). La
instalás encima — no perdés datos.

### ¿Funciona sin internet?

Sí, durante un rato. Vendés normal, las ventas quedan en cola en
el celular, y cuando vuelve la conexión se sincronizan
automáticamente al servidor.

### ¿Cuánto puedo estar offline?

Depende de cuántas ventas hagas, pero típicamente **varias horas
sin problemas**. El límite real es cuándo te quedás sin batería o
cuando el celular se quede sin espacio (improbable).

### ¿Funciona en iPhone?

Hoy no — solo Android. iOS está en roadmap (long-term, 6–12
meses).

### ¿Qué pasa si se rompe el celular?

- Si las ventas estaban **sincronizadas** (lo normal), no perdés
  nada. Instalás la app en otro celular y entrás con el mismo
  usuario.
- Si tenías ventas **pendientes de sync** y el celular muere antes
  de subirlas, ESAS ventas se pierden. Por eso es buena práctica
  forzar sync al final del turno.

---

## Sobre datos y privacidad

### ¿Quién ve mis datos?

Solo vos y los usuarios que vos creés. Tu base de datos está en un
servidor dedicado solo para vos. Dyon Labs accede únicamente para
tareas de soporte que vos pidas, y todo queda en logs auditables.

### ¿Cumplen con la Ley 21.719 (datos personales Chile)?

La arquitectura de "deployment dedicado" **facilita** el
cumplimiento porque tus datos están físicamente aislados de los de
otros clientes y existe trazabilidad de cambios vía AuditLog. Esto
no equivale a una certificación legal: el cumplimiento total
depende también de tus políticas internas (avisos de privacidad,
manejo de RUT en boletas, retención, etc.) y de una revisión por
abogado especializado. Te ayudamos con la parte técnica, pero la
revisión legal queda de tu lado.

### ¿Hacen backups?

Sí, hacemos un **backup automático pre-actualización** antes de
cada deploy del sistema y mantenemos las últimas **14 copias** en
el mismo VPS. Si algo falla durante una actualización, restauramos
sin que tengas que hacer nada.

> ℹ️ La política de **backups diarios** y **copia off-site** (a
> S3 / Backblaze u otro proveedor externo) está como decisión
> pendiente (DR-10 en `docs/architecture/decision-log.md`). Si tu
> negocio requiere RPO/RTO formal, conversémoslo para incluir un
> plan de retención dedicado.

### ¿Puedo descargar mi propia data?

Sí. Pedinos un dump cuando quieras. Es un archivo Postgres
estándar que cualquier desarrollador puede leer.

### ¿Si dejo de pagar, qué pasa con mis datos?

Te entregamos un dump completo y damos de baja el VPS después
de **30 días de gracia** desde el último pago. Durante ese
tiempo seguís teniendo acceso al panel para descargar lo que
necesites.

---

## Sobre precios y facturación

### ¿Cómo se factura?

Mensualmente, contra suscripción. Te emitimos factura electrónica
SII formal por el monto del plan.

### ¿Hay setup fee?

No. Empezás pagando solo la primera mensualidad.

### ¿Puedo cambiar de plan?

Sí, en cualquier momento. Si subís de plan, prorrateamos el mes
en curso. Si bajás, aplica el mes siguiente.

### ¿Hay contrato mínimo?

No. Mensual, mes a mes, sin permanencia.

### ¿Hay descuento si pago anual?

Sí: **2 meses gratis** pagando 12 por adelantado. Pedinos cotización.

---

## Sobre soporte

### ¿Qué incluye el soporte?

- Resolución de bugs (sin costo, prioridad por severidad).
- Consultas operativas por canal (WhatsApp, email).
- Actualizaciones del sistema cuando sacamos versión nueva.
- Restauración de backups si algo falla del lado nuestro.

### ¿Qué NO incluye el soporte?

- Cargar tu catálogo por vos (eso es lo que vos hacés en el
  onboarding o con el add-on Premium).
- Capacitar a un cajero nuevo después del onboarding inicial
  (excepto Plan Business, que sí incluye recapacitación).
- Personalización de software (cambios al código, nuevas pantallas,
  integraciones a la medida) — eso es trabajo a presupuesto.

### ¿Cuál es el horario de soporte?

Lunes a viernes 9:00–19:00 hora Chile. Urgencias 24/7 con SLA
distinto según plan.

### ¿Cómo reporto un problema?

WhatsApp del canal de soporte (te lo damos al contratar). Si
podés, mandá foto/captura de pantalla y describí qué hacías cuando
pasó.

---

## Sobre operación día a día

### ¿Qué hago si un código de barra no está en el sistema?

Dos opciones:
1. **Buscalo por nombre** desde el campo de búsqueda en POS Caja /
   app móvil. Si existe, vendelo así.
2. Si no existe, **avisá al ADMIN** para que lo cree desde el
   panel web. Mientras tanto, podés crear un producto "Genérico"
   con precio variable que cubra estos casos.

### ¿Puedo vender productos por peso (a granel)?

Hoy hay que digitar el precio manualmente al final. La
integración con balanza electrónica está en backlog pero no
priorizada. Workaround: crear productos "100g", "250g", "500g"
para los que vendas habitualmente fraccionados.

### ¿Cómo manejo crédito / fiado?

Registrás al cliente con RUT desde **Clientes**. Al cobrar la
venta, elegís método de pago "Crédito" en lugar de efectivo. La
deuda queda asociada al cliente. Después podés ver totales por
cliente en reportes.

### ¿Cuántos cajeros pueden vender al mismo tiempo?

DyPos CL soporta múltiples cajeros en paralelo, cada uno con su
usuario. El **límite práctico depende de la infraestructura y del
plan contratado**. El sistema maneja ventas concurrentes
correctamente — no hay riesgo de "robarse" stock entre cajeros
mientras estén online.

### ¿Y si el internet del local se cae completamente?

Los celulares siguen vendiendo offline. El panel web NO funciona
sin internet. En la práctica, los clientes que tienen un solo
computador admin y celulares para vender están bien — el cajero
sigue trabajando.

### ¿Puedo conectar una impresora térmica?

**Hoy no — está en roadmap.** La integración con impresoras térmicas
(Bluetooth ESC/POS) requiere desarrollo específico que aún no está
implementado en la app móvil ni en el panel web. Mientras tanto, si
necesitás comprobante físico podés imprimir el detalle de la venta
desde el navegador (Ctrl/Cmd + P) en una impresora normal.

Si para tu negocio es bloqueante, avisanos — priorizamos según
demanda.

### ¿Puedo conectar un cajón de dinero?

Como la impresora térmica todavía no está integrada (ver pregunta
anterior), tampoco se puede abrir un cajón de dinero electrónico
desde DyPos CL. Por ahora el manejo del cajón es manual.

---

## Sobre el roadmap

### ¿Qué viene en los próximos meses?

En orden de prioridad:

1. **Boleta electrónica SII** (Sprint F-8, 6–8 semanas).
2. **Inventory v2**: kardex, valuación, análisis ABC (post F-8).
3. **Integración con impresora térmica Bluetooth** (ESC/POS) y
   compartir comprobante por WhatsApp desde la app móvil.
4. **iOS** app móvil (long-term).
5. **API pública** para integraciones B2B (eCommerce, contabilidad).

> ✅ **Observabilidad mobile (Sentry)**: ya implementado y validado
> con el issue `POS-CHILE-MOBILE-1`. Cualquier crash o error en la
> app móvil se reporta automáticamente al dashboard de Sentry de
> Dyon Labs para diagnóstico — no perdés visibilidad si algo
> falla.

### ¿Puedo pedir features?

Sí, mandá la propuesta al canal de soporte. Las priorizamos según
cuántos clientes la pidan. Si es muy específica para tu negocio,
podemos hacerla a presupuesto como personalización.

### ¿Cuándo van a tener marketplace de extensiones?

Es una idea de long-term (6–12 meses). Hoy DyPos CL se vende como
producto cerrado con personalizaciones a la medida.

---

## Otras dudas

### ¿Por qué se llama DyPos CL?

`Dy` por **Dyon Labs** (la empresa que lo construye), `Pos` por
**Point of Sale**, `CL` por Chile.

### ¿Quién está detrás del proyecto?

Pierre Benites Solier (Dyon Labs). Repositorio privado, propiedad
intelectual privada. Si querés saber más de la visión, leé
[`docs/VISION.md`](../VISION.md) y [`docs/SALES-PHILOSOPHY.md`](../SALES-PHILOSOPHY.md).

### ¿Y si querés dejar de usar DyPos CL?

Entendemos. Te pasamos un dump completo de tu data en formato
Postgres estándar. No hay penalidad. Te damos 30 días de gracia
para descargar todo. Esperamos volver a verte.

---

_Última actualización: 2026-05-01 — Fase 3B._
