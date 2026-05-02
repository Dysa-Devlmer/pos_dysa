# Manual del Panel Web — DyPos CL

> Audiencia: dueños de negocio y administradores. Se asume que tu
> proveedor (Dyon Labs) ya te entregó la URL de tu instalación y los
> usuarios iniciales. Si no es así, ver
> [`onboarding-cliente.md`](./onboarding-cliente.md).

---

## 1. Cómo entrar al sistema

1. Abrí el navegador (Chrome o Edge recomendados) en tu computador.
2. Andá a la dirección que te dieron al contratar, por ejemplo:
   `https://tubodega.dypos.zgamersa.com`.
3. En la pantalla de login, ingresá tu **email** y tu **contraseña**.
4. Si es una contraseña temporal, el sistema te lleva automáticamente
   a **Cambiar contraseña** antes de mostrar el Dashboard. Ahí ingresás
   la temporal que recibiste y elegís una nueva.

> 💡 Recomendación: dejá un acceso directo en el escritorio del
> computador para no tener que escribir la dirección cada vez.

**Cerrar sesión:** click en tu avatar (esquina superior derecha) →
"Cerrar sesión". Importante en computadores compartidos.

---

## 2. La pantalla principal — Dashboard

Apenas entrás, llegás al **Dashboard**. Es el resumen del negocio:

- **KPIs del día**: ventas, ingresos, ticket promedio, productos
  vendidos.
- **Gráfico de ventas** de la última semana.
- **Top 5 productos** más vendidos del mes.
- **Últimas 10 ventas** con cliente, total y método de pago.
- **Banner de alertas** arriba si hay productos con stock bajo.

Desde el Dashboard podés ir a cualquier sección por la **barra
lateral izquierda**.

---

## 3. La barra lateral — qué hace cada sección

| Sección | Para qué sirve | Quién puede entrar |
|---|---|---|
| **Inicio** | Dashboard con KPIs del día | ADMIN y CAJERO |
| **POS Caja** | Vender (interfaz táctil/teclado) | ADMIN y CAJERO |
| **Ventas** | Historial de ventas, ver detalle, editar, eliminar | ADMIN; CAJERO solo lee |
| **Devoluciones** | Anular ventas total o parcialmente | ADMIN |
| **Productos** | Catálogo: crear, editar, importar CSV | ADMIN |
| **Categorías** | Gestionar categorías de productos | ADMIN |
| **Clientes** | Lista de clientes con RUT | ADMIN |
| **Cajas** | Aperturas/cierres de turno | ADMIN |
| **Alertas** | Productos con stock bajo | ADMIN |
| **Reportes** | Reportes vista, PDF, Excel | ADMIN |
| **Usuarios** | Crear cajeros nuevos, cambiar contraseñas | ADMIN |
| **Mi perfil** | Tu foto, tus datos, cambio de contraseña | todos |
| **Mobile Releases** | Descargar APK para los celulares | ADMIN |
| **Docs** | Privacidad y términos del sistema | todos |

---

## 4. Operación día a día — guía rápida del cajero

### 4.1 Abrir caja al inicio del turno

Antes de la primera venta del día:

1. Andá a **Cajas**.
2. Click en **"Abrir caja"**.
3. Ingresá el **monto inicial en efectivo** (lo que hay físicamente
   en la caja chica al empezar).
4. Confirmá. Ya podés vender.

> ⚠️ El sistema **no permite vender sin caja abierta**. Si entrás a
> POS Caja sin haber abierto, te redirige a `/caja/abrir` para que
> hagás la apertura primero. No es opcional — es el primer paso del
> turno.

### 4.2 Vender — el módulo POS Caja

1. Click en **POS Caja** en la barra lateral.
2. **Agregar productos** al carrito de tres formas:
   - Escribí el nombre o código en el buscador.
   - Escaneá con un lector USB (queda como teclado virtual).
   - Click en una tarjeta de producto del catálogo en pantalla.
3. **Cantidad**: se ajusta con `+` / `–` o tipeando.
4. **Descuento** (opcional): activá la casilla "Aplicar descuento" e
   ingresá monto fijo o porcentaje.
5. **Cliente** (opcional): si el comprador da RUT, agregálo desde el
   campo cliente. Si no, queda como "consumidor final".
6. **Cobro**:
   - **Efectivo**: tipeá el monto recibido y el sistema te muestra
     el vuelto.
   - **Tarjeta** (débito o crédito): tipeá el monto cobrado.
   - **Transferencia**: tipeá el monto.
   - **Crédito** (fiado a un cliente con RUT registrado): se asocia
     a la cuenta del cliente.
   - **Pago mixto**: combiná los anteriores. La suma debe ser igual
     al total.
7. Click en **"Finalizar venta"**.
8. Aparece el **comprobante** con el detalle. Podés:
   - **Ver el detalle** en pantalla.
   - **Compartir** un link público del comprobante interno. El link
     protege datos personales: nombre abreviado y RUT enmascarado.
   - **Imprimir** el comprobante con el navegador (Ctrl/Cmd + P
     desde la vista del detalle).
   - Cerrar el modal y atender al siguiente cliente.

> 💡 IVA: el sistema usa 19% fijo (Chile). El subtotal y el IVA se
> muestran desglosados en la boleta automáticamente.

### 4.3 Cerrar caja al final del turno

1. Andá a **Cajas**.
2. En tu caja abierta, click **"Cerrar caja"**.
3. El sistema te muestra el monto teórico que debería haber según
   las ventas en efectivo del turno.
4. Ingresá el **monto real contado** físicamente en la caja chica.
5. El sistema te marca la **diferencia** (positiva = sobrante,
   negativa = faltante). Confirmá.
6. Listo: la caja queda cerrada y registrada.

> ⚠️ Una vez cerrada, no se puede reabrir. Si te equivocaste con el
> monto, hablá con el ADMIN para que ajuste el registro.

---

## 5. Gestión de productos

### 5.1 Crear un producto manualmente

1. **Productos** → **"+ Nuevo producto"**.
2. Llenar:
   - **Nombre** (2 a 120 caracteres). Ej. "Coca-Cola 1.5L".
   - **Código de barra** (3 a 60 caracteres). Único.
   - **Precio** (entero CLP, sin decimales). Ej. `1990`.
   - **Stock** inicial. Ej. `60`.
   - **Alerta de stock** (umbral). Ej. `10`. Cuando el stock baja a
     este número, aparece en alertas.
   - **Categoría** (debe existir antes — crearla en "Categorías").
   - **Descripción** (opcional, hasta 500 caracteres).
   - **Activo** (sí/no). Inactivo = no aparece en POS Caja.
3. Guardar.

### 5.2 Editar / desactivar / eliminar un producto

- **Editar**: click en el producto → cambia campos → guardar.
- **Desactivar**: marcar "Activo: no". El producto deja de aparecer
  en POS Caja pero conserva el historial de ventas.
- **Eliminar**: solo si el producto NUNCA tuvo ventas. Si ya tiene
  historial, el sistema bloquea el delete (para no romper reportes
  ni AuditLog) — usá "desactivar" en su lugar.

### 5.3 Importar productos masivamente desde CSV

Para cargar de una vez 50, 500 o 5.000 productos (típico al
empezar):

1. **Productos** → botón **"Importar CSV"**.
2. **Descargar plantilla** desde el botón del modal. Te baja un
   archivo `.csv` de ejemplo con la estructura correcta.
3. Llenar la plantilla en Excel o Google Sheets:
   - Columnas obligatorias: `nombre`, `codigoBarras`, `precio`,
     `categoria`.
   - Columnas opcionales: `stock`, `alertaStock`, `descripcion`,
     `activo`.
   - **Categoría**: usá el NOMBRE de la categoría tal como existe
     en el sistema (no el id). Si la categoría no existe, el sistema
     marca error en esa fila — creala antes desde "Categorías".
   - **Precio**: aceptamos `1990`, `1.990`, o `$1.990`. NO acepta
     decimales (`1990,50` da error).
   - **Activo**: aceptamos `si`, `no`, `true`, `false`, `1`, `0`.
4. Guardar como **CSV** (no .xlsx). Tamaño máximo: 5 MB / 5.000
   filas.
5. Volver al modal "Importar CSV", arrastrá el archivo o click
   "Seleccionar archivo".
6. **Preview**: el sistema valida fila por fila y te muestra:
   - **Filas válidas** que se van a importar.
   - **Errores** por fila con mensaje claro (ej. "precio fuera de
     rango", "categoria no existe").
   - **Duplicados** (productos que ya existen en tu catálogo por
     código de barra).
7. Si hay **algún error**, el sistema NO importa nada. Corregí el
   archivo y volvé a subirlo. Política "todo o nada" — para evitar
   imports a medio terminar.
8. Si todo está OK:
   - Marcá la casilla **"Actualizar productos existentes"** si
     querés que los duplicados se actualicen (precio nuevo, stock
     nuevo). Si la dejás desmarcada, los duplicados se saltan.
   - Click en **"Confirmar importación"**.
9. El sistema importa todo en una sola transacción y te muestra el
   resumen: `creados / actualizados / saltados`.

> 💡 Tip: si recién empezás, importá tu catálogo entero en una
> sola pasada. Si después actualizás precios, podés usar el mismo
> CSV con la casilla "Actualizar existentes" marcada.

---

## 6. Categorías

Las categorías agrupan productos para reportes y filtros.

- **Categorías** → **"+ Nueva categoría"**. Solo necesita nombre.
- Una categoría se puede **desactivar** (deja de aparecer en
  selectores nuevos pero los productos viejos siguen funcionando).
- No se puede eliminar una categoría con productos asociados.

---

## 7. Clientes

Permite registrar compradores frecuentes con RUT para:

- Asociarles ventas (útil si llevan crédito/fiado).
- Ver su historial de compras.
- Generar reportes de "clientes top" por monto.

**Crear cliente**: **Clientes** → "+ Nuevo cliente":
- Nombre completo.
- **RUT** en formato `12.345.678-9`. El sistema valida el dígito
  verificador automáticamente.
- Email y teléfono (opcionales).

> 💡 La gran mayoría de las ventas son a "consumidor final" sin RUT.
> Los clientes registrados son para fidelización o crédito.

---

## 8. Devoluciones

Para anular o devolver una venta:

1. **Devoluciones** o desde el detalle de la venta original
   (**Ventas** → click venta → botón "Devolver").
2. Elegí:
   - **Devolución total**: se anula la venta entera. El stock vuelve
     a los productos. La venta original queda marcada como
     "anulada".
   - **Devolución parcial**: marcás cuántas unidades de cada
     producto se devuelven. El sistema ajusta el total.
3. Confirmá. Aparece el comprobante de devolución, que podés ver
   en pantalla, compartir por link protegido y, si necesitás papel,
   imprimir desde el navegador (Ctrl/Cmd + P) cuando corresponda.

> ⚠️ Las devoluciones quedan registradas en AuditLog. NO se pueden
> eliminar — eso es deliberado para mantener trazabilidad contable.

---

## 9. Reportes

**Reportes** → te muestra varios bloques con filtro de fechas
arriba (hoy, ayer, esta semana, este mes, rango custom):

- **Resumen general**: total vendido, # ventas, ticket promedio,
  IVA.
- **Ventas por día**: gráfico de barras.
- **Top productos**: los 20 más vendidos del rango.
- **Ventas por cajero**: cuánto vendió cada usuario.
- **Ventas por método de pago**: efectivo / tarjeta / transferencia.
- **Ventas por categoría**.

**Exportar:**
- Botón **"Descargar PDF"** — reporte formateado para imprimir o
  enviar al contador.
- Botón **"Descargar Excel"** — datos crudos para análisis propio.

---

## 10. Alertas de stock bajo

**Alertas** → lista de productos cuyo `stock <= alertaStock`.

Para cada producto vas a ver:
- Nombre, código.
- Stock actual / umbral configurado.
- Botón "Editar producto" para reponer manualmente.

Cuando hay alertas activas, aparece un **banner naranja** en el
Dashboard con el conteo. Click en el banner te lleva a la lista.

---

## 11. Usuarios

Solo el ADMIN puede gestionar usuarios.

**Usuarios** → "+ Nuevo usuario":
- Email (debe ser único).
- Nombre.
- **Rol**: ADMIN o CAJERO.
- Contraseña inicial — queda marcada como temporal. En el primer login
  web, el usuario debe escribir esa temporal y elegir una nueva.

**Resetear contraseña**: editar el usuario → ingresar una nueva
contraseña temporal. En el próximo login web, el usuario deberá
cambiarla antes de entrar al Dashboard.

> ℹ️ La app móvil no acepta usuarios con contraseña temporal. Si un
> cajero intenta entrar primero desde el celular, verá un mensaje
> pidiendo cambiar la contraseña en el panel web.

**Desactivar usuario**: marcar "Activo: no". No puede entrar al
sistema pero su historial de ventas queda intacto.

> ⚠️ NO eliminés usuarios que ya hicieron ventas. Desactivalos
> únicamente — eso preserva los reportes históricos.

---

## 12. Mi perfil

Cada usuario puede:
- Cambiar su **avatar** (foto).
- Editar nombre y email.
- **Cambiar su contraseña** (mostrando indicador de fortaleza).
- Ver su **actividad reciente** (últimas ventas, últimos cambios).

---

## 13. Mobile Releases

Si tenés cajeros con celular Android, en **Mobile Releases**
encontrás la última versión de la APK con tu marca para descargar
e instalarla en sus dispositivos.

Detalles del proceso de instalación: ver
[`manual-mobile.md`](./manual-mobile.md) sección "Instalar la app
por primera vez".

---

## 14. Atajos útiles del navegador

| Acción | Atajo |
|---|---|
| Buscar producto en POS Caja | foco automático en input al entrar |
| Navegar más rápido | usar teclado: `Tab` y `Enter` en formularios |
| Volver atrás | flecha atrás del navegador funciona como esperás |
| Recargar si algo se ve raro | `Ctrl+R` (Windows/Linux) o `Cmd+R` (Mac) |

---

_Última actualización: 2026-05-01 — Fase 3B._
