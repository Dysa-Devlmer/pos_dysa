<?php session_start(); ?>
<!doctype html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Sistema POS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
  <meta name="color-scheme" content="light dark" />
  <link rel="icon" href="vistas/img/plantilla/icono-negro.png">

  <!--=======================================
  FUENTES
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fontsource/source-sans-3@5.0.12/index.css"
    crossorigin="anonymous" media="print" onload="this.media='all'" />

  <!--=======================================
  OVERLAY SCROLLBARS
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/styles/overlayscrollbars.min.css"
    crossorigin="anonymous" />

  <!--=======================================
  BOOTSTRAP ICONS
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
    crossorigin="anonymous" />

  <!--=======================================
  FONT AWESOME 6
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/css/all.min.css"
    crossorigin="anonymous" />

  <!--=======================================
  ADMINLTE 4 (local)
  ========================================-->
  <link rel="stylesheet" href="vistas/adminlte/css/adminlte.min.css" />

  <!--=======================================
  DATATABLES 2 + BOOTSTRAP 5
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.datatables.net/v/bs5/jq-3.7.0/dt-2.2.2/b-3.2.2/b-html5-3.2.2/b-print-3.2.2/fc-5.0.4/fh-4.0.1/r-3.0.4/sc-2.4.3/sb-1.8.2/sp-2.3.3/sl-2.1.0/datatables.min.css"
    crossorigin="anonymous" />

  <!--=======================================
  APEXCHARTS
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/apexcharts@4.3.0/dist/apexcharts.css"
    crossorigin="anonymous" />

  <!--=======================================
  FLATPICKR (date picker)
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css"
    crossorigin="anonymous" />
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/material_blue.css"
    crossorigin="anonymous" />

  <!--=======================================
  SWEETALERT 2
  ========================================-->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/sweetalert2@11.15.10/dist/sweetalert2.min.css"
    crossorigin="anonymous" />

  <!--=======================================
  ESTILOS PERSONALIZADOS
  ========================================-->
  <style>
    /* Transiciones suaves en sidebar */
    .app-sidebar { transition: all 0.3s ease; }

    /* Cards con sombra suave */
    .card { box-shadow: 0 2px 12px rgba(0,0,0,.08); border: none; border-radius: 10px; }
    .card-header { border-radius: 10px 10px 0 0 !important; }

    /* Botones con animación */
    .btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
    .btn:active { transform: translateY(0); }

    /* Tablas más limpias */
    .table thead th { font-weight: 600; font-size: .85rem; text-transform: uppercase; letter-spacing: .5px; }

    /* Badges animados */
    .badge { font-size: .75rem; }

    /* Inputs mejorados */
    .form-control:focus, .form-select:focus {
      box-shadow: 0 0 0 0.2rem rgba(13,110,253,.15);
    }

    /* Animación fade en cambio de sección */
    .app-content { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    /* Sidebar active link */
    .sidebar-menu .nav-link.active { font-weight: 600; }

    /* Avatar en navbar */
    .user-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }

    /* SweetAlert2 z-index */
    .swal2-container { z-index: 99999 !important; }
  </style>

</head>

<?php
  $logueado = isset($_SESSION["iniciarSesion"]) && $_SESSION["iniciarSesion"] == "ok";
  $bodyClass = $logueado ? "layout-fixed sidebar-expand-lg bg-body-tertiary" : "login-page";
?>
<body class="<?= $bodyClass ?>">

<?php if($logueado): ?>

  <!--begin::App Wrapper-->
  <div class="app-wrapper">

    <!--=======================================
    HEADER / NAVBAR
    ========================================-->
    <nav class="app-header navbar navbar-expand bg-body shadow-sm">
      <div class="container-fluid">

        <!-- Toggle sidebar + logo mini -->
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button">
              <i class="bi bi-list fs-5"></i>
            </a>
          </li>
        </ul>

        <!-- Logo en navbar -->
        <a class="navbar-brand ms-2 d-lg-none" href="inicio">
          <img src="vistas/img/plantilla/icono-negro.png" height="28" alt="POS">
        </a>

        <!-- Derecha: usuario -->
        <ul class="navbar-nav ms-auto align-items-center gap-2">

          <!-- Notificaciones rápidas (placeholder) -->
          <li class="nav-item d-none d-md-block">
            <a href="inicio" class="nav-link">
              <i class="bi bi-house-door"></i>
            </a>
          </li>

          <!-- Dropdown usuario -->
          <li class="nav-item dropdown">
            <a class="nav-link d-flex align-items-center gap-2" data-bs-toggle="dropdown" href="#" role="button">
              <?php if(!empty($_SESSION["foto"])): ?>
                <img src="<?= $_SESSION["foto"] ?>" class="user-avatar" alt="avatar">
              <?php else: ?>
                <img src="vistas/img/usuarios/default/anonymous.png" class="user-avatar" alt="avatar">
              <?php endif; ?>
              <span class="d-none d-md-inline fw-semibold"><?= htmlspecialchars($_SESSION["nombre"]) ?></span>
              <i class="bi bi-chevron-down small"></i>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="min-width:200px">
              <li>
                <div class="px-3 py-2 border-bottom">
                  <div class="fw-semibold"><?= htmlspecialchars($_SESSION["nombre"]) ?></div>
                  <small class="text-muted"><?= htmlspecialchars($_SESSION["perfil"]) ?></small>
                </div>
              </li>
              <li><a class="dropdown-item" href="salir">
                <i class="bi bi-box-arrow-right me-2 text-danger"></i>Cerrar sesión
              </a></li>
            </ul>
          </li>

        </ul>
      </div>
    </nav>
    <!--end::Header-->

    <!--=======================================
    SIDEBAR
    ========================================-->
    <?php include "modulos/menu.php"; ?>

    <!--=======================================
    CONTENIDO PRINCIPAL
    ========================================-->
    <main class="app-main">
      <div class="app-content pt-3 pb-4">
        <div class="container-fluid">

          <?php
          if(isset($_GET["ruta"])){
            $rutas_permitidas = [
              "inicio","usuarios","categorias","productos",
              "clientes","ventas","crear-venta","editar-venta","reportes","salir"
            ];
            if(in_array($_GET["ruta"], $rutas_permitidas)){
              include "modulos/" . $_GET["ruta"] . ".php";
            } else {
              include "modulos/404.php";
            }
          } else {
            include "modulos/inicio.php";
          }
          ?>

        </div>
      </div>

      <!--=======================================
      FOOTER
      ========================================-->
      <?php include "modulos/footer.php"; ?>
    </main>
    <!--end::Main-->

  </div>
  <!--end::App Wrapper-->

<?php else: ?>

  <?php include "modulos/login.php"; ?>

<?php endif; ?>


<!--=======================================
JQUERY
========================================-->
<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js" crossorigin="anonymous"></script>

<!--=======================================
OVERLAY SCROLLBARS (requerido por AdminLTE 4)
========================================-->
<script src="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/browser/overlayscrollbars.browser.es5.min.js" crossorigin="anonymous"></script>

<!--=======================================
ADMINLTE 4 (local)
========================================-->
<script src="vistas/adminlte/js/adminlte.min.js"></script>

<!--=======================================
DATATABLES 2 + BOOTSTRAP 5 + EXTENSIONES
========================================-->
<script src="https://cdn.datatables.net/v/bs5/jq-3.7.0/dt-2.2.2/b-3.2.2/b-html5-3.2.2/b-print-3.2.2/fc-5.0.4/fh-4.0.1/r-3.0.4/sc-2.4.3/sb-1.8.2/sp-2.3.3/sl-2.1.0/datatables.min.js"
  crossorigin="anonymous"></script>

<!--=======================================
APEXCHARTS
========================================-->
<script src="https://cdn.jsdelivr.net/npm/apexcharts@4.3.0/dist/apexcharts.min.js" crossorigin="anonymous"></script>

<!--=======================================
SWEETALERT 2
========================================-->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.15.10/dist/sweetalert2.min.js" crossorigin="anonymous"></script>

<!--=======================================
FLATPICKR + ESPAÑOL
========================================-->
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/es.js" crossorigin="anonymous"></script>

<!--=======================================
INPUTMASK 5
========================================-->
<script src="https://cdn.jsdelivr.net/npm/inputmask@5.0.9/dist/inputmask.min.js" crossorigin="anonymous"></script>

<!--=======================================
AUTONUMERIC (formatos de moneda)
========================================-->
<script src="https://cdn.jsdelivr.net/npm/autonumeric@4.10.5/dist/autoNumeric.min.js" crossorigin="anonymous"></script>

<!--=======================================
JS DEL SISTEMA
========================================-->
<script src="vistas/js/plantilla.js"></script>
<script src="vistas/js/usuarios.js"></script>
<script src="vistas/js/categorias.js"></script>
<script src="vistas/js/productos.js"></script>
<script src="vistas/js/clientes.js"></script>
<script src="vistas/js/ventas.js"></script>
<script src="vistas/js/reportes.js"></script>

<!--=======================================
CONFIGURACIÓN GLOBAL + SHIMS DE COMPATIBILIDAD
Los shims permiten que el código del curso (ventas.js,
reportes.js, etc.) funcione sin modificarlo.
========================================-->
<script>
/* ─── 1. Flatpickr en español ─────────────────────── */
flatpickr.localize(flatpickr.l10ns.es);

/* ─── 2. SweetAlert2 Toast helper ────────────────── */
window.Toast = Swal.mixin({
  toast: true, position: 'top-end',
  showConfirmButton: false, timer: 3000, timerProgressBar: true,
  didOpen: (t) => { t.onmouseenter = Swal.stopTimer; t.onmouseleave = Swal.resumeTimer; }
});

/* ─── 3. SHIM: swal() → SweetAlert2 ──────────────────
   El curso usa swal({ title, type, text, confirmButtonText })
   SweetAlert2 usa Swal.fire({ title, icon, text, confirmButtonText })
   ─────────────────────────────────────────────────── */
window.swal = function(opciones, texto, tipo) {
  // Soporte para swal("título", "texto", "tipo")
  if (typeof opciones === 'string') {
    return Swal.fire({ title: opciones, text: texto, icon: tipo || 'info' });
  }
  return Swal.fire({
    title:              opciones.title,
    text:               opciones.text,
    icon:               opciones.type || opciones.icon || 'info',
    confirmButtonText:  opciones.confirmButtonText  || 'Aceptar',
    cancelButtonText:   opciones.cancelButtonText   || 'Cancelar',
    showCancelButton:   opciones.showCancelButton   || false,
    confirmButtonColor: opciones.confirmButtonColor || '#3085d6',
    cancelButtonColor:  opciones.cancelButtonColor  || '#d33',
  });
};

/* ─── 4. SHIM: $.fn.number() → Intl.NumberFormat ─────
   El curso usa $(".precio").number(true, 2)
   Lo reemplazamos con formato nativo del navegador
   ─────────────────────────────────────────────────── */
$.fn.number = function(format, decimals) {
  decimals = decimals != null ? decimals : 2;
  return this.each(function() {
    var raw = parseFloat($(this).val().toString().replace(/,/g, '')) || 0;
    if (format) {
      $(this).val(raw.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }));
    }
  });
};

/* ─── 5. SHIM: moment() → Date nativo ────────────────
   El curso usa moment() para daterangepicker.
   Implementamos lo que se usa en ventas.js y reportes.js
   ─────────────────────────────────────────────────── */
window.moment = function(input) {
  var d = input instanceof Date ? new Date(input) : (input ? new Date(input) : new Date());
  var self = {
    _d: d,
    format: function(fmt) {
      var y  = d.getFullYear(),
          mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0');
      return fmt
        .replace('YYYY', y).replace('MM', mo).replace('DD', dd)
        .replace('YYYY-MM-DD', y+'-'+mo+'-'+dd)
        .replace('MMMM D, YYYY', d.toLocaleDateString('es', {year:'numeric',month:'long',day:'numeric'}));
    },
    subtract: function(n, unit) {
      var nd = new Date(d);
      if (unit === 'days')   nd.setDate(nd.getDate() - n);
      if (unit === 'month' || unit === 'months') nd.setMonth(nd.getMonth() - n);
      return window.moment(nd);
    },
    startOf: function(unit) {
      var nd = new Date(d);
      if (unit === 'month') { nd.setDate(1); nd.setHours(0,0,0,0); }
      return window.moment(nd);
    },
    endOf: function(unit) {
      var nd = new Date(d);
      if (unit === 'month') nd = new Date(nd.getFullYear(), nd.getMonth()+1, 0);
      return window.moment(nd);
    },
    toDate: function() { return d; },
    valueOf: function() { return d.getTime(); }
  };
  return self;
};

/* ─── 6. SHIM: $.fn.daterangepicker() → Flatpickr ────
   El curso usa $('#btn').daterangepicker({ranges}, callback)
   Lo mapeamos a Flatpickr con mode:'range'
   ─────────────────────────────────────────────────── */
$.fn.daterangepicker = function(opciones, callback) {
  return this.each(function() {
    var el = this;
    // Crear un input oculto auxiliar para Flatpickr
    var inputId = 'fp_' + Math.random().toString(36).substr(2,6);
    var fpInput = $('<input type="text" id="'+inputId+'" style="display:none">').insertAfter(el);

    flatpickr(fpInput[0], {
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale: 'es',
      onChange: function(selectedDates) {
        if (selectedDates.length === 2 && typeof callback === 'function') {
          var start = window.moment(selectedDates[0]);
          var end   = window.moment(selectedDates[1]);
          callback(start, end);
        }
      }
    });

    // Al hacer click en el botón original, abrir Flatpickr
    $(el).on('click', function(e) {
      e.preventDefault();
      fpInput[0]._flatpickr.open();
    });
  });
};

/* ─── 7. Confirmación global ──────────────────────── */
window.confirmar = function(mensaje, callback) {
  Swal.fire({
    title: '¿Estás seguro?', text: mensaje, icon: 'warning',
    showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar'
  }).then((r) => { if (r.isConfirmed) callback(); });
};
</script>

</body>
</html>
