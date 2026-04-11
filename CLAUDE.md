# CLAUDE.md — system_pos · POS Inventarios & Ventas

> **⚠️ OBLIGATORIO — LEER COMPLETO AL INICIO DE CADA SESIÓN**
> Este archivo define las reglas absolutas del proyecto. No hay excepciones.

---

## 🚀 Stack Tecnológico (NO cambiar sin autorización)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | PHP | 8.2 |
| Patrón | MVC custom | — |
| Frontend | AdminLTE + Bootstrap | 4.0.0-rc7 + BS5 |
| CSS Icons | Bootstrap Icons | 1.11+ |
| Charts | ApexCharts | 4.x |
| Alerts | SweetAlert2 | 11.x |
| Tables | DataTables | 2.x (BS5) |
| DB | MySQL | 8.0 |
| Infra | Docker | compose v2 |
| Date picker | Flatpickr | 4.x |

---

## 🔴 REGLAS OBLIGATORIAS — SE APLICAN SIEMPRE

### 1. DEE — Devlmer Ecosystem Engine (activar en cada sesión)

Al inicio de cada sesión ejecutar mentalmente este checklist DEE:

```
✅ Skills activos según la tarea:
   - Código PHP/JS      → senior-backend + code-reviewer
   - Diseño de sistema  → senior-architect
   - Seguridad          → senior-security (OWASP Top 10)
   - Commit/git         → git-commit-helper (conventional commits)
   - UI/UX              → senior-frontend

✅ Comandos disponibles: /dee-status · /dee-doctor · /dee-demo
✅ Agentes paralelos para: code-review · security-audit · testing
✅ Hooks activos:
   - PHP  → sintaxis verificada con py_compile equivalente
   - JS   → flagged para build verification
```

**Si hay dudas sobre el estado DEE:** `/dee-status` o `/dee-doctor`

---

### 2. Convenciones de código PHP (MVC)

```php
// ✅ CORRECTO — métodos estáticos siempre
ControladorCategorias::ctrCrearCategoria();
ControladorUsuarios::ctrBorrarUsuario();

// ❌ PROHIBIDO — nunca instanciar controladores
new ControladorCategorias()->ctrCrearCategoria();

// ✅ Shorthand PHP obligatorio
<?= $variable ?>   // NO <?php echo $variable; ?>

// ✅ Arrays asociativos modernos
$data = ["key" => "value"];   // NO array("key" => "value")
```

**Estructura de carpetas — respetar siempre:**
```
pos/
├── controladores/    # lógica de negocio, métodos static
├── modelos/          # queries SQL, PDO
├── ajax/             # endpoints AJAX, devuelven JSON
├── vistas/
│   ├── modulos/      # páginas PHP (Bootstrap 5)
│   ├── js/           # archivos JS por módulo
│   └── includes/     # header, footer, sidebar
└── index.php         # router principal
```

---

### 3. Convenciones Frontend (Bootstrap 5 + AdminLTE 4)

```html
<!-- ✅ BS5 — OBLIGATORIO -->
data-bs-toggle="modal"
data-bs-target="#modalId"
data-bs-dismiss="modal"
<button class="btn-close"></button>
<div class="card"><div class="card-header"><div class="card-body">
<span class="input-group-text">
<i class="bi bi-icon-name"></i>   <!-- Bootstrap Icons, NO Font Awesome -->

<!-- ❌ PROHIBIDO — AdminLTE 2 / BS3 legacy -->
data-toggle · data-target · data-dismiss (sin bs-)
<div class="box"> · <div class="box-header with-border">
<span class="input-group-addon">
<i class="fa fa-icon">
col-xs-* · pull-left · pull-right · btn-default
```

---

### 4. JavaScript — DataTables + AJAX

```javascript
// ✅ Event delegation OBLIGATORIO (rows dinámicas)
$(".tablas").on("click", ".btnEditar", function(){ ... });
$(".tablas").on("click", ".btnEliminar", function(){ ... });

// ❌ PROHIBIDO — no funciona con DataTables
$("#btnEditar").click(function(){ ... });

// ✅ URLs con encodeURIComponent siempre
window.location = "index.php?ruta=X&param=" + encodeURIComponent(valor);

// ✅ SweetAlert2 — usar window.swal (shim de compatibilidad)
window.swal({ title: "...", icon: "success" });
```

---

### 5. Código limpio — reglas absolutas

- **Una responsabilidad por función** — si hace más de una cosa, dividirla
- **Nombres descriptivos** — `ctrCrearUsuario` no `ctr1` ni `guardar`
- **Sin código comentado** — si no se usa, se elimina
- **Sin console.log en producción** — solo durante debug, luego eliminar
- **Validación siempre en dos capas** — frontend (JS) + backend (PHP)
- **Queries SQL en modelos** — nunca SQL directo en controladores o vistas
- **AJAX devuelve JSON** — siempre `Content-Type: application/json`
- **Errores con try/catch** — nunca dejar errores sin manejar

---

### 6. Flujo de trabajo por módulo (checklist antes de cerrar)

Antes de dar por terminado cualquier módulo verificar:

```
□ Vista (.php)     → Bootstrap 5 puro, sin clases legacy
□ Controlador      → métodos static, validación de entrada
□ Modelo           → queries PDO, sin SQL injection
□ AJAX             → devuelve JSON, maneja errores
□ JS               → event delegation, encodeURIComponent
□ Modal crear      → funciona y cierra correctamente
□ Modal editar     → carga datos, guarda cambios
□ Eliminar         → SweetAlert2 de confirmación
□ DataTable        → carga datos, búsqueda, paginación
□ Bootstrap Icons  → todos los íconos correctos
□ Responsive       → probado en móvil (col-lg/md/sm)
```

---

### 7. Módulos del proyecto — estado actual

| Módulo | Vista | JS | Controlador | Modelo | Estado |
|--------|-------|----|-------------|--------|--------|
| Categorías | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Clientes | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Productos | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Usuarios | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Ventas | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Crear Venta | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Editar Venta | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Reportes | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| 404 | ✅ | — | — | — | ✅ Completo |
| REST API | ✅ | — | ✅ | ✅ | ✅ Completo (bonus) |

> **Actualizar esta tabla en cada sesión** cuando se complete o inicie un módulo.

---

### 8. Próximos módulos / tareas pendientes

```
[x] Dashboard — ApexCharts (ventas del día, top productos, resumen KPIs) ✅
[x] REST API — JWT + CRUD genérico en pos/api/ ✅
[x] Facturas PDF — TCPDF moderno: factura A4 + ticket térmico ✅
[x] datatable-ventas.ajax.php — static + json_encode + BS5 badges ✅
[x] datatable-productos.ajax.php — static + json_encode + BS5 ✅
[x] ventas.js — daterangepicker/moment.js → Flatpickr 4.x ✅
[x] ventas.php — span.rango-texto + botón limpiar fecha condicional ✅
[ ] Perfil de usuario — editar datos, cambiar contraseña, foto
[ ] Inventario / alertas de stock bajo
[ ] Módulo de proveedores (si el curso lo incluye)
[ ] Tests básicos de integración AJAX
```

---

### 9. Infraestructura Docker

```yaml
# Servicios activos:
php-apache:  localhost:8080   # app principal
mysql:       localhost:3306   # BD: system_pos
phpmyadmin:  localhost:8081   # admin BD

# Comandos útiles:
docker compose up -d          # levantar
docker compose down           # apagar
docker compose logs -f php    # ver logs PHP
```

---

### 10. Android-MCP (emulador para pruebas móviles)

```
Dispositivo:  emulator-5554
Fix aplicado: lazy init (conecta solo al invocar herramienta)
Herramientas: Snapshot · Click · Type · Press · Notification

Estado: ✅ Operativo
```

---

## 📋 Checklist de inicio de sesión (OBLIGATORIO)

Al empezar cada sesión de trabajo, hacer esto en orden:

1. **Leer este CLAUDE.md completo** — especialmente la tabla de módulos
2. **Activar DEE skills** según la tarea del día
3. **Revisar "Próximas tareas"** — saber qué módulo sigue
4. **Preguntar al usuario** si hay cambios de prioridad
5. **Al terminar** — actualizar tabla de módulos y tareas pendientes

---

## ⚙️ Archivos de configuración DEE

| Archivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Este archivo — reglas del proyecto |
| `.claude/CLAUDE.md` | Copia para Claude Code CLI |
| `.claude/settings.json` | Hooks, MCPs, configuración engine |
| `.claude/PROJECT_PROFILE.json` | Perfil detectado del proyecto |
| `.claude/mcp-env-setup.sh` | API keys para integraciones MCP |

**DEE instalado:** v3.1.1 · Path: `/Users/devlmer/.local/bin/dee`
**Proyecto:** `/Users/devlmer/Dysa-Projects/system_pos`
**Components:** 62 skills · 67 commands · 14 agents · 21 MCPs · 2 hooks
