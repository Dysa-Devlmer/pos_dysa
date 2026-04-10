<?php /* DASHBOARD — Bootstrap 5 / AdminLTE 4 */ ?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Dashboard</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Tablero</li>
      </ol>
    </nav>
  </div>
  <span class="text-muted small"><i class="bi bi-calendar3 me-1"></i><?= date('d/m/Y') ?></span>
</div>

<?php if($_SESSION["perfil"] == "Administrador"): ?>

  <!-- ============ TARJETAS SUPERIORES ============ -->
  <div class="row g-3 mb-4">
    <?php include "inicio/cajas-superiores.php"; ?>
  </div>

  <!-- ============ GRÁFICA DE VENTAS ============ -->
  <div class="row g-3 mb-4">
    <div class="col-lg-8">
      <?php include "reportes/grafico-ventas.php"; ?>
    </div>
    <div class="col-lg-4">
      <?php include "reportes/productos-mas-vendidos.php"; ?>
    </div>
  </div>

  <!-- ============ PRODUCTOS RECIENTES ============ -->
  <div class="row g-3">
    <div class="col-12">
      <?php include "inicio/productos-recientes.php"; ?>
    </div>
  </div>

<?php else: ?>

  <!-- Bienvenida para Vendedor / Especial -->
  <div class="row justify-content-center mt-5">
    <div class="col-md-6 text-center">
      <div class="card border-0 shadow-sm" style="border-radius:16px;">
        <div class="card-body py-5">
          <div class="mb-3">
            <i class="bi bi-person-check-fill text-primary" style="font-size:3rem;"></i>
          </div>
          <h4 class="fw-bold">¡Bienvenid@, <?= htmlspecialchars($_SESSION["nombre"]) ?>!</h4>
          <p class="text-muted mb-4">Perfil: <span class="badge bg-primary"><?= htmlspecialchars($_SESSION["perfil"]) ?></span></p>
          <a href="crear-venta" class="btn btn-primary px-4">
            <i class="bi bi-plus-circle me-2"></i>Nueva Venta
          </a>
        </div>
      </div>
    </div>
  </div>

<?php endif; ?>
