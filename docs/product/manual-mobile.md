# Manual de la App Móvil — DyPos CL

> Audiencia: cajeros y vendedores que van a usar DyPos CL desde un
> celular o tablet Android. La app está pensada para vender rápido en
> mostrador, no para administrar el negocio (eso se hace en el panel
> web — ver [`manual-web.md`](./manual-web.md)).

---

## 1. Para qué sirve la app móvil

La app es la **herramienta del cajero en piso**. Sirve para:

✅ Vender rápido escaneando códigos de barra con la cámara del
   celular.
✅ Cobrar efectivo, tarjeta, transferencia o pago mixto.
✅ Mostrar boleta interna al cliente en pantalla.
✅ Ver tus últimas ventas del turno.
✅ Hacer devoluciones (si tenés permiso).
✅ Trabajar **offline** un rato — si se cae el internet, podés seguir
   vendiendo y la app sincroniza después.

❌ NO sirve para crear productos, gestionar usuarios, ver reportes
   complejos ni configurar el sistema. Eso es del panel web.

---

## 2. Requisitos del celular

- **Android 7.0 o superior** (la mayoría de celulares de 2017 en
  adelante).
- **Cámara funcional** para escanear códigos de barra.
- **Conexión a internet** estable la mayor parte del tiempo (WiFi
  del local o datos móviles).
- Espacio libre: **~80 MB** para la app.

> 💡 Recomendación: dedicá un celular **solo** para DyPos CL en el
> mostrador. Mezclar con WhatsApp personal genera errores y
> distracciones.

---

## 3. Instalar la app por primera vez

La app NO está en Google Play (es exclusiva de tu negocio). Se
instala manualmente con un archivo `.apk`. Lo coordina el
administrador desde el panel web.

### Pasos:

1. **El ADMIN descarga la APK** desde el panel web (sección
   "Mobile Releases") y se la pasa al cajero por WhatsApp, Drive,
   Bluetooth o conectando el celular por USB.
2. En el celular, abrir el archivo `.apk` (con "Mi File Manager" o
   el administrador de archivos del celular).
3. Si Android pide permiso para "instalar aplicaciones de orígenes
   desconocidos", **aceptar**.
4. En celulares **Xiaomi/MIUI** puede aparecer "Bloqueado por
   Seguridad". Hay que abrirlo desde Mi File Manager (no desde el
   bloqueo) y aceptar.
5. La app queda instalada con el ícono de tu negocio.

> 💡 Si te aparece "Aplicación dañada", lo más probable es que el
> archivo se cortó al transferir. Pedile al ADMIN que te la pase de
> nuevo.

### Actualizar la app

Cuando salga una versión nueva (mejoras o correcciones), el ADMIN
te avisa y te pasa la APK nueva. Instalala encima de la actual:
**si la firma de la APK es la misma** (Android lo verifica solo),
los datos locales y tu sesión se preservan. Como la mayoría de la
información vive en la nube de tu negocio, el riesgo en la práctica
es bajo.

> ⚠️ Antes de actualizar, **forzá la sincronización** desde
> tab Más → "Sincronizar ahora". Eso garantiza que cualquier venta
> offline pendiente quedó subida al servidor antes de tocar la app.
> Si por algún motivo Android pide desinstalar la versión vieja
> (firma distinta o conflicto), los datos locales se borran — por
> eso el sync previo es importante.

---

## 4. Iniciar sesión

1. Abrir la app — pantalla de login.
2. Ingresar tu **email** y **contraseña** (los que te dio el ADMIN).
3. La primera vez, por seguridad cambiá tu contraseña desde
   **Más → Mi perfil** apenas entres.
4. Listo. La sesión queda guardada en el celular — no necesitás
   loguearte cada día, solo si cerrás sesión a propósito.

**Cerrar sesión**: tab "Más" → "Cerrar sesión". Importante si
varios cajeros comparten el mismo celular.

---

## 5. Las 4 pestañas de abajo

Todo se navega con las 4 pestañas inferiores:

| Pestaña | Para qué sirve |
|---|---|
| **Caja** | Vender. La pantalla principal del cajero. |
| **Ventas** | Ver tus ventas del turno y poder hacer devoluciones. |
| **Dashboard** | KPIs simples del día (cuánto vendiste, cuántas ventas). |
| **Más** | Tu perfil, cerrar sesión, configuración, ayuda. |

---

## 6. Cómo vender — flujo completo

### Paso 1: agregar productos al carrito

Hay tres formas:

**Opción A — escanear código de barra (la más rápida):**
1. Tab **Caja** → tocar el ícono de cámara (📷) arriba.
2. Apuntá la cámara al código de barra. Se enfoca solo.
3. Cuando reconoce el código, agrega el producto al carrito y
   vuelve automáticamente a la pantalla de venta.

**Opción B — buscar por nombre:**
1. Tab **Caja** → tocar el campo de búsqueda.
2. Escribí parte del nombre ("coca", "pan", "leche").
3. Tocá el producto en la lista.

**Opción C — desde el catálogo en pantalla:**
1. Si tenés productos frecuentes definidos (panel web), aparecen
   como tarjetas grandes.
2. Tocá una para agregarla.

### Paso 2: ajustar cantidades / quitar productos

- En el carrito: `+` y `–` para subir/bajar cantidad.
- Botón papelera para quitar el producto del carrito.
- Tocar la cantidad permite tipear un número exacto.

### Paso 3: aplicar descuento (opcional)

Tocar **"Descuento"** → elegir entre monto fijo o porcentaje. El
total se actualiza al instante.

### Paso 4: asociar cliente (opcional)

Tocar **"Cliente"** → elegir de la lista o agregar uno nuevo con
RUT. Si es venta a consumidor final, dejá vacío.

### Paso 5: cobrar

Tocar **"Cobrar"**. Aparece la pantalla de pago:

- **Efectivo**: tipear monto recibido. Te muestra el **vuelto**.
- **Tarjeta** / **Transferencia**: tipear monto cobrado.
- **Mixto**: combinar varios métodos. La app valida que la suma sea
  exacta al total.

Tocar **"Confirmar venta"**.

### Paso 6: comprobante

Aparece el comprobante con todo el detalle. Acciones:

- **Mostrar** el comprobante en pantalla para que el cliente vea
  el detalle.
- **Compartir comprobante** → abre el menú nativo de Android para
  enviarlo por WhatsApp, email u otra app. El link público protege
  datos personales: nombre abreviado y RUT enmascarado.
- **"Cerrar"** → vuelve a la pantalla de Caja, lista para la
  siguiente venta.

> ℹ️ La impresión por impresora térmica Bluetooth sigue en roadmap.
> Si necesitás comprobante físico, imprimí desde el panel web.

> 💡 Tip de velocidad: con un cliente normal, escanear → cobrar
> efectivo → confirmar son ~5 segundos. Practicá el flujo en hora
> tranquila para hacerlo automático.

---

## 7. Trabajar offline

Si se cae el internet:

1. **La app sigue funcionando**. Podés vender, cobrar, mostrar
   comprobante.
2. Cada venta queda guardada **en el celular** con un indicador
   amarillo "pendiente sync".
3. Cuando vuelva el internet, la app **sincroniza automáticamente**.
4. Las ventas ofli se suben en orden y se reflejan en el panel web.

> ⚠️ Cuidado:
> - Los **stocks no se actualizan en tiempo real** mientras estás
>   offline. Si dos cajeros venden el mismo producto en simultáneo
>   sin internet, podés tener stock descuadrado al sincronizar.
>   Para almacenes chicos con un solo cajero esto rara vez es
>   problema.
> - Si el celular se rompe ANTES de sincronizar, las ventas
>   pendientes se pierden. Por eso es buena práctica forzar sync
>   apenas vuelva el wifi (tab "Más" → "Sincronizar ahora").

---

## 8. Ver y devolver tus ventas

**Tab Ventas** → lista de tus ventas del turno actual.

- Tocar una venta abre el detalle: productos, total, método de
  pago, hora.
- Si tenés permiso, botón **"Devolver"**:
  - **Devolución total** anula la venta completa.
  - **Devolución parcial** te deja marcar cuántas unidades de cada
    producto devolver.

> 💡 Las devoluciones quedan registradas para siempre. Si te
> equivocaste, hablá con el ADMIN — solo desde el panel web se
> puede revisar el AuditLog.

---

## 9. Tab Dashboard — tus KPIs del día

Vista rápida de tu turno:

- Cuánto llevás vendido (en pesos).
- Cuántas ventas hiciste.
- Ticket promedio.
- Top 3 productos del día.

Sirve para que sepas cómo vas sin tener que abrir el panel web.

---

## 10. Tab Más — perfil y configuración

- **Mi perfil**: foto, nombre, cambiar contraseña.
- **Sincronizar ahora**: forzar sync manual (útil si dudás de la
  conexión).
- **Cerrar sesión**.
- **Versión de la app** (útil cuando hablás con soporte para que
  sepan qué APK tenés instalada).
- **Ayuda / contacto soporte**.

---

## 11. Problemas frecuentes

### "No me reconoce el código de barra"

- Verificá que la cámara esté limpia (sin polvo o grasa).
- Iluminación: si está oscuro, prendé la luz del local. La cámara
  necesita luz para enfocar.
- Si el código es muy chico o está dañado, tipeá el código a mano
  desde el campo de búsqueda.

### "La app me dice 'sin conexión' pero el WiFi anda"

- Tocá "Sincronizar ahora" en tab Más.
- Si sigue sin sincronizar, cerrá la app del todo (deslizar fuera
  del multitarea) y abrila de nuevo.
- Si nada funciona, avisá al ADMIN.

### "El total no me cuadra al cierre"

- Las ventas se sincronizan al servidor — pedile al ADMIN que mire
  el panel web (Cajas → tu cierre) para ver el detalle.
- Las pequeñas diferencias suelen ser ventas en efectivo no
  registradas o cambios mal calculados al apuro.

### "Quiero corregir una venta que ya cobré"

- No se puede editar desde la app móvil. Pedile al ADMIN que la
  edite/elimine desde el panel web. La app solo permite
  **devolver**, no editar.

### "Se me cerró sola la app"

- Probá abrirla de nuevo — la sesión y el carrito se mantienen.
- Si pasa seguido, contale al ADMIN para que reporte el bug y se
  vea desde Sentry (la app reporta errores automáticamente para
  diagnóstico).

---

## 12. Buenas prácticas

1. **Sincronizá al final del turno**: tab Más → "Sincronizar ahora"
   antes de irte. Garantiza que todas tus ventas quedaron en el
   servidor.
2. **Mantené el celular cargado**: enchufalo en el mostrador. Una
   batería muerta a la mitad del turno mata la operación.
3. **No instales otras APKs raras**: cuanto más limpio el celular
   POS, más rápida y estable es la app.
4. **No cierres sesión si compartís el celular** entre turnos
   distintos del mismo cajero — ahorrá los reload. SÍ cerrá si
   cambia el cajero (importante para el AuditLog).
5. **Pedí actualización si te dicen que hay versión nueva**: las
   nuevas APKs traen mejoras de velocidad y arregla bugs. Es
   gratis.

---

_Última actualización: 2026-05-01 — Fase 3B._
