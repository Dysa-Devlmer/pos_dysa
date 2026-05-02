# Onboarding de cliente nuevo — DyPos CL

> Audiencia: el dueño de un negocio que acaba de contratar DyPos CL
> y quiere saber qué pasa los próximos días, qué tiene que entregar
> y cómo dejar el sistema listo para vender.

---

## Resumen rápido — del contrato al primer venta

```
Día 0  → Firmas contrato + pagás la primera mensualidad.
Día 1  → Dyon Labs te entrega URL, usuarios y APK.
Día 2  → Cargás tu catálogo (manual o por CSV).
Día 3  → Capacitación de cajeros (1 hora).
Día 4  → Primer turno real con respaldo de Pierre por chat.
Día 7  → Check-in semanal de Dyon Labs para ajustes.
```

Total: en menos de **una semana** estás vendiendo con DyPos CL.

---

## Día 0 — Lo que pasa al firmar

### Lo que vos hacés

1. **Elegís plan** (Starter / Pro / Business — ver
   [`PRICING-STRATEGY.md`](../PRICING-STRATEGY.md)).
2. **Pagás la primera mensualidad**.
3. **Decidís el dominio**:
   - **Subdominio gratis**: `[tu-marca].dypos.zgamersa.com`. Listo en
     minutos.
   - **Dominio propio** (ej. `pos.tubodega.cl`): podés agregarlo
     después; necesitás cambiar un registro DNS y nosotros lo
     configuramos. Sin costo adicional.
4. **Mandás el logo de tu negocio** (PNG cuadrado, fondo
   transparente si tenés). Va al panel web y a la app móvil.

### Lo que hace Dyon Labs

1. **Provisiona tu VPS dedicado** (Vultr Chile o Hetzner —
   automático con el script `scripts/provision-tenant.sh`).
2. **Crea tu base de datos limpia** con migrations al día.
3. **Configura HTTPS** y tu subdominio.
4. **Crea tu usuario ADMIN inicial** con email que vos diste.
5. **Prepara tu APK** con tu logo embebido.

---

## Día 1 — Te entregamos las llaves

Vas a recibir por email:

1. **URL de tu panel web**: ej. `https://tubodega.dypos.zgamersa.com`.
2. **Email + contraseña inicial** de tu usuario ADMIN.
3. **APK móvil** (archivo `.apk`) con tu marca para los celulares
   de los cajeros.
4. **Link a este manual** (`docs/product/`) para que lo tengas a
   mano.

### Tu primer login

1. Abrí la URL en Chrome.
2. Ingresás email y contraseña.
3. El sistema te obliga a **cambiar la contraseña inicial** —
   elegí algo que recuerdes pero que no sea fácil de adivinar.
4. Ya estás dentro. Vas a ver el Dashboard vacío (cero ventas, cero
   productos).

---

## Día 2 — Cargar tu catálogo y configurar

Esta es la etapa más larga del onboarding. **Una buena carga
inicial te ahorra problemas durante meses.**

### Paso 1 — Crear las categorías

Desde **Categorías** → "+ Nueva categoría". Crea las que tenga
sentido para tu negocio. Ejemplos típicos:

- Almacén: `Bebidas`, `Almacén`, `Lácteos`, `Limpieza`, `Cigarros`,
  `Otros`.
- Panadería: `Pan`, `Pastelería`, `Bebidas`, `Fiambres`, `Almacén`.
- Ferretería: `Tornillos`, `Herramientas`, `Pintura`, `Eléctrico`,
  `Plomería`.

> 💡 No te compliques. Empezá con 5–8 categorías. Siempre podés
> agregar después.

### Paso 2 — Cargar productos

**Si tenés menos de ~30 productos**, cargá uno por uno desde
**Productos** → "+ Nuevo producto". Es rápido.

**Si tenés más de 30**, usá la **importación por CSV** (recomendado
fuertemente):

1. **Productos** → "Importar CSV" → "Descargar plantilla".
2. Abrí la plantilla en Excel o Google Sheets.
3. Llená una fila por producto. Mantené las cabeceras tal cual.
4. Guardá como **CSV** (no .xlsx).
5. Subí el archivo al modal de importación.
6. Revisá el **preview** que muestra el sistema:
   - Filas válidas que se van a importar.
   - Errores por fila (ej. precio mal, categoría que no existe).
7. Si hay errores, corregís el archivo y volvés a subirlo. Política
   "todo o nada" — nada se importa hasta que TODAS las filas estén
   bien.
8. Confirmás → tus productos quedan cargados en segundos.

> 💡 Hasta 5.000 productos en un solo archivo. Si tenés más,
> dividilos en varios CSV (ej. uno por categoría).

### Paso 3 — Crear cajeros

Desde **Usuarios** → "+ Nuevo usuario". Para cada cajero:
- Email (real, lo van a usar para login).
- Nombre.
- Rol: **CAJERO**.
- Contraseña inicial — pensá una temporal y pasásela en persona.

> 💡 No compartas un solo usuario entre varios cajeros. Tener un
> usuario por persona te permite saber **quién** vendió qué — clave
> para reportes y para detectar problemas.

### Paso 4 — (Opcional) Cargar clientes frecuentes

Si tenés clientes que compran a crédito o querés llevar
fidelización, cargá los principales desde **Clientes**. La gran
mayoría de las ventas son consumidor final sin RUT — no es
obligatorio.

### Paso 5 — Probar una venta de prueba

Desde **POS Caja** → agregá un producto, cobrá efectivo $1.000,
finalizá venta. Mirá la boleta. Verificá que todo se vea bien.
Después borrá la venta de prueba desde **Ventas**.

---

## Día 3 — Capacitar cajeros

Sesión de **1 hora** con todos tus cajeros juntos. Recomendamos
hacerla con el local cerrado o en hora muerta.

### Agenda sugerida

1. **(15 min)** Mostrarles el panel web brevemente: cómo entrar,
   dónde están las ventas, qué NO pueden tocar.
2. **(30 min)** Práctica con la app móvil:
   - Login.
   - Escanear código de barra → vender.
   - Cobrar efectivo + cobrar mixto.
   - Compartir boleta por WhatsApp.
   - Hacer una devolución.
   - Sincronizar manualmente.
3. **(15 min)** Reglas operativas del local:
   - Quién abre y cierra caja.
   - Qué hacer si no aparece un código (tipear nombre vs. crear
     nuevo producto desde el panel web).
   - Qué hacer si se cae el internet (seguir vendiendo offline,
     sincronizar después).
   - A quién avisarle si algo se rompe.

> 💡 Filmá la capacitación con el celular. Sirve para entrenar
> reemplazos sin volver a explicar todo.

---

## Día 4 — Primer turno real

Día clave. Recomendamos:

- **Empezá medio día** (ej. solo turno tarde) en lugar de un día
  entero, así no te abrumás si algo sale raro.
- **Tené al ADMIN cerca**, mirando el panel web mientras los
  cajeros trabajan. Ver las ventas entrar en tiempo real te da
  confianza.
- **Mandanos un mensaje** apenas pase la primera venta — te
  felicitamos y revisamos que esté todo bien por nuestro lado.
- **Antes de cerrar**, sincronizá manualmente todos los celulares
  y cuadrá caja contra el panel web.

### Si algo falla

- Anotá lo que pasó (qué pantalla, qué error, a qué hora).
- Sacá foto si podés.
- Mandalo por WhatsApp al canal de soporte.
- Si es bloqueante, pasamos al modo cuaderno + calculadora unas
  horas mientras resolvemos.

---

## Día 7 — Check-in semanal

A la semana del Día 1, Dyon Labs te contacta para revisar:

- ¿Cómo se sienten los cajeros con la app?
- ¿Apareció algún caso que el sistema no cubre bien?
- ¿Hay productos que no aparecieron en el catálogo y los están
  vendiendo "manual"?
- ¿Querés agregar otra categoría / otro cajero / otro reporte?

Después de este check-in, las revisiones pasan a ser **mensuales**.

---

## Lo que NO necesitás aprender

Tranquilidad: hay cosas que **NO son tu problema** y nunca te
vamos a pedir que las hagas:

- ❌ No tenés que **hacer backups** — los hacemos nosotros
  automáticamente antes de cada actualización del sistema.
- ❌ No tenés que **actualizar el servidor** — lo hacemos nosotros
  desde el lado de Dyon Labs.
- ❌ No tenés que **mantener el dominio** — está incluido.
- ❌ No tenés que **saber SQL ni programar** — el panel web cubre
  todo.
- ❌ No tenés que **entender de Linux ni de Docker**.

Vos te ocupás de **vender y cobrar**. Nosotros del fierro.

---

## Lo que SÍ es responsabilidad tuya

- 🔑 **Cuidar las contraseñas**: no las anotes en un papel pegado
  en la caja.
- 🔄 **Pedir reset de contraseña** apenas un cajero se va del
  trabajo.
- 📦 **Mantener el catálogo al día**: precios actualizados, nuevos
  productos, dar de baja los que ya no vendés.
- 📊 **Mirar reportes al menos 1 vez por semana**: para detectar
  cosas raras (mucho descuento, productos que no se venden, etc.).
- 🧾 **Emitir boleta SII por tu canal habitual** — DyPos CL aún no
  emite e-boleta. Si tu negocio tributa IVA, seguí con tu
  proveedor de boleta electrónica actual mientras tanto.

---

## Onboarding Premium (opcional)

Si preferís que vayamos a tu local presencialmente, existe el
add-on **Onboarding Premium** ($150.000 CLP por única vez):

- 4 horas presenciales en tu negocio.
- Carga de catálogo asistida.
- Capacitación cajeros en su lugar de trabajo.
- Configuración de impresora térmica si tenés.
- Quedamos hasta tu primera hora de venta real.

Ideal si:
- No te sentís cómodo con tecnología.
- Tenés más de 5 cajeros.
- El catálogo es muy grande (>2.000 productos) y querés ayuda
  organizándolo.

---

_Última actualización: 2026-05-01 — Fase 3B._
