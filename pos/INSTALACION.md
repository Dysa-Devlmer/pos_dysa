# 🛠️ Guía de Instalación — Sistema POS

## Requisitos
- **PHP** 8.2 o superior
- **MySQL** 8.0 o superior
- **Apache** con mod_rewrite activado
- **XAMPP**, **Laragon** o **WAMP** (cualquiera funciona)

---

## 📁 Paso 1 — Copiar el proyecto

Copia la carpeta `pos/` a la raíz de tu servidor local:

**XAMPP:**
```
C:\xampp\htdocs\pos\
```

**Laragon:**
```
C:\laragon\www\pos\
```

**WAMP:**
```
C:\wamp64\www\pos\
```

---

## 🗄️ Paso 2 — Crear la base de datos

1. Abre **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Crea una base de datos llamada **`pos`** (cotejamiento: `utf8mb4_general_ci`)
3. Selecciona la base de datos `pos`
4. Ve a la pestaña **Importar**
5. Selecciona el archivo `pos.sql` que está dentro de la carpeta del proyecto
6. Haz clic en **Continuar**

---

## ⚙️ Paso 3 — Configurar conexión (si es necesario)

Abre el archivo `modelos/conexion.php` y verifica/edita:

```php
define('DB_HOST', 'localhost');   // normalmente no cambia
define('DB_NAME', 'pos');         // nombre de tu base de datos
define('DB_USER', 'root');        // usuario MySQL
define('DB_PASS', '');            // contraseña (vacío en XAMPP/Laragon por defecto)
```

---

## 🌐 Paso 4 — Activar mod_rewrite (solo XAMPP)

El sistema usa URLs amigables (ej: `localhost/pos/inicio`).

En XAMPP, abre `C:\xampp\apache\conf\httpd.conf` y asegúrate de que esta línea **no** tenga `#` al inicio:
```
LoadModule rewrite_module modules/mod_rewrite.so
```

También busca el bloque `<Directory "C:/xampp/htdocs">` y cambia:
```
AllowOverride None
```
por:
```
AllowOverride All
```

Reinicia Apache después del cambio.

> **Laragon** ya tiene mod_rewrite activo por defecto ✅

---

## 🚀 Paso 5 — Abrir el sistema

Con Apache y MySQL corriendo, abre tu navegador:

```
http://localhost/pos
```

### Credenciales de acceso:
| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin` |

---

## 📦 Estructura del proyecto

```
pos/
├── index.php                  ← Punto de entrada
├── .htaccess                  ← Rutas amigables
├── pos.sql                    ← Base de datos
├── INSTALACION.md             ← Este archivo
├── controladores/             ← Lógica de negocio
├── modelos/                   ← Conexión y consultas DB
│   └── conexion.php           ← ⚠️ Configura aquí tu DB
├── ajax/                      ← Endpoints AJAX
├── extensiones/               ← TCPDF (PDFs y barcodes)
│   └── vendor/
└── vistas/
    ├── adminlte/              ← AdminLTE 4 (CSS/JS local)
    ├── img/                   ← Imágenes del sistema
    ├── js/                    ← JavaScript del sistema
    └── modulos/               ← Páginas/vistas del sistema
        ├── plantilla.php      ← Layout principal con AdminLTE 4
        ├── menu.php           ← Sidebar dinámico
        ├── login.php          ← Pantalla de acceso
        ├── inicio.php         ← Dashboard
        ├── usuarios.php       ← Gestión de usuarios
        ├── categorias.php     ← Gestión de categorías
        ├── productos.php      ← Gestión de productos
        ├── clientes.php       ← Gestión de clientes
        ├── ventas.php         ← Historial de ventas
        ├── crear-venta.php    ← Pantalla POS (caja)
        └── reportes.php       ← Reportes y estadísticas
```

---

## 🧰 Stack tecnológico (versiones modernas)

| Tecnología | Versión | Nota |
|---|---|---|
| AdminLTE | 4.0.0-rc7 | Local |
| Bootstrap | 5.3.x | Incluido en AdminLTE 4 |
| Bootstrap Icons | 1.13.1 | CDN |
| Font Awesome | 6.7.2 | CDN |
| DataTables | 2.2.2 + BS5 | CDN con extensiones |
| ApexCharts | 4.3.0 | CDN |
| SweetAlert2 | 11.15.10 | CDN |
| Flatpickr | 4.6.13 | CDN |
| Inputmask | 5.0.9 | CDN |
| AutoNumeric | 4.10.5 | CDN |
| TCPDF | 6.7.x | Composer (local) |
| jQuery | 3.7.1 | CDN |

---

## ❓ Problemas comunes

**"No se encuentra la página" / Error 404:**
→ Verifica que mod_rewrite esté activo y que `AllowOverride All` esté configurado.

**"Error de conexión a la base de datos":**
→ Verifica que MySQL esté corriendo y que los datos en `conexion.php` sean correctos.

**"Call to undefined function":**
→ Asegúrate de estar usando PHP 8.2+. Verifica en `http://localhost/phpmyadmin` la versión de PHP.
