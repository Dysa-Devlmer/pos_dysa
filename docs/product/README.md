# Manual del producto — DyPos CL

> Esta carpeta es para **personas que usan DyPos CL**, no para
> programadores. Si vas a tocar código, ve a `docs/architecture/`.

---

## ¿Qué es DyPos CL?

DyPos CL es un **sistema de punto de venta (POS)** pensado para
comercios chilenos chicos y medianos: almacenes de barrio,
panaderías, ferreterías, kioscos, locales de feria, retail boutique.

Tiene dos partes que funcionan juntas:

1. **Panel web** — se abre desde un computador con un navegador
   (Chrome, Edge, Firefox). Es el "puesto del dueño": configurás
   productos, ves reportes, gestionás caja y devoluciones.
2. **App Android** — se instala en un celular o tablet del cajero.
   Es el "puesto del cajero": vende rápido, escanea códigos de
   barra, cobra y muestra el comprobante interno en pantalla al
   cliente.

Cada cliente que contrata DyPos CL recibe **su propia copia
aislada**: su dominio (ej. `tubodega.dypos.zgamersa.com`), su base
de datos, su APK con tu marca. Nada se mezcla con otros clientes.

---

## ¿Para quién es este manual?

| Si sos... | Empezá por... |
|---|---|
| **Dueño del negocio** que recién contrató DyPos CL | [`onboarding-cliente.md`](./onboarding-cliente.md) → [`manual-web.md`](./manual-web.md) |
| **Cajero / vendedor** que va a usar la app del celular | [`manual-mobile.md`](./manual-mobile.md) |
| **Administrador** que va a configurar productos/usuarios | [`manual-web.md`](./manual-web.md) |
| **Tienes una duda específica** | [`faq.md`](./faq.md) |

---

## Glosario rápido

Términos que aparecen seguido en el sistema y conviene tener claros
antes de empezar:

| Término | Significado |
|---|---|
| **ADMIN** | Usuario con permisos completos. Puede crear productos, ver reportes, gestionar usuarios, importar CSV. Es el rol del dueño o encargado. |
| **CAJERO** | Usuario con permisos de venta. Puede abrir/cerrar caja, vender, hacer devoluciones autorizadas. NO toca configuración. |
| **Caja** | Una sesión de trabajo del cajero. Se abre con un monto inicial (apertura), registra ventas durante el turno, y se cierra con el monto contado al final. |
| **Producto** | Algo que vendés. Tiene nombre, código de barra, precio en pesos chilenos, stock, categoría. |
| **Categoría** | Grupo de productos (ej. "Bebidas", "Almacén", "Lácteos"). Sirve para reportes y para organizar el catálogo. |
| **Cliente** | Un comprador identificado por nombre y RUT. Opcional — la mayoría de las ventas son a "consumidor final" sin RUT. |
| **Venta** | Una transacción concreta. Tiene un total, los productos vendidos, el método de pago, la fecha. Genera una **boleta interna** (no e-boleta SII). |
| **Devolución** | Anular total o parcialmente una venta. Devuelve stock al producto y genera un registro auditable. |
| **Boleta interna** | Comprobante que emite DyPos CL (en pantalla, imprimible desde el navegador). **NO es boleta electrónica SII** — eso viene en una versión futura. |
| **Stock** | Cuántas unidades te quedan de un producto. Baja al vender, sube al recibir devolución. |
| **Alerta de stock** | Umbral por producto. Cuando el stock cae debajo del umbral, aparece en el panel de alertas para que repongas. |
| **Reporte** | Vista resumida de tus ventas, productos más vendidos, ingresos por día/semana/mes. Exportable a PDF y Excel. |
| **AuditLog** | Registro automático de cada cambio importante (creación, edición, eliminación). Útil para revisar qué pasó si algo se descuadra. |
| **Sync** | Cuando la app móvil sube las ventas que hizo offline a la base de datos central. Requiere internet. |

---

## Lo que sí hace DyPos CL hoy

✅ Catálogo completo de productos con código de barra, stock, categorías.
✅ Importar productos masivos por CSV (hasta 5.000 filas).
✅ Vender desde web o desde app móvil — con scanner de código de
   barra del celular.
✅ Cobrar mixto: efectivo + tarjeta + transferencia + crédito en una
   misma venta.
✅ Generar boleta interna en pantalla, imprimible desde el navegador.
✅ Devoluciones totales o parciales con devolución automática de stock.
✅ Reportes de ventas por día / semana / mes / cajero / producto.
✅ Exportar reportes a PDF y Excel.
✅ Alertas de stock bajo.
✅ Multi-usuario con roles ADMIN / CAJERO.
✅ AuditLog automático de todo cambio crítico.
✅ Backup automático antes de cada actualización del sistema.

---

## Lo que NO hace DyPos CL hoy

⚠️ **No emite boleta electrónica SII** — eso está en roadmap (Sprint
   F-8). Hoy DyPos CL emite **boleta interna** que sirve como
   comprobante para el cliente y para tu registro, pero NO reemplaza
   la boleta electrónica obligatoria del SII. Si tu negocio tributa
   IVA, debés seguir emitiendo boleta SII por tu canal habitual.

⚠️ **Mobile no es 100 % autónoma** — la app móvil puede vender sin
   internet por un rato (modo offline), pero al final del turno
   necesita conexión para sincronizar contra el servidor. Sin internet
   prolongado, los reportes en el panel web quedan atrasados.

⚠️ **Mobile no reemplaza al admin web** — en el celular podés vender,
   ver tus ventas y hacer devoluciones, pero NO podés crear productos
   nuevos, gestionar usuarios, ni ver reportes complejos. Eso se hace
   desde el panel web.

⚠️ **No hay integración con balanza electrónica** — los productos por
   peso (ej. fruta a granel) deben pesarse aparte y digitar el precio
   manualmente.

⚠️ **No hay e-commerce integrado** — DyPos CL es para venta presencial.
   Si querés vender online, necesitás otra herramienta.

Detalles completos de límites en [`faq.md`](./faq.md).

---

## Cómo está organizado este manual

```
docs/product/
├── README.md                ← este archivo
├── manual-web.md            ← panel web: todas las pantallas
├── manual-mobile.md         ← app Android: pantallas + flujos
├── onboarding-cliente.md    ← qué pasa cuando contratás (día 0 → día 7)
└── faq.md                   ← preguntas frecuentes + límites
```

---

_Última actualización: 2026-05-01 — Fase 3B._
