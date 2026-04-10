<?php

if($_SESSION["perfil"] == "Especial" || $_SESSION["perfil"] == "Vendedor"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Reportes</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Reportes de ventas</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Filtros y descarga -->
<div class="card shadow-sm mb-4">
  <div class="card-header d-flex flex-wrap align-items-center gap-2">

    <!-- Filtro de rango de fechas -->
    <button type="button" class="btn btn-outline-secondary btn-sm" id="daterange-btn2">
      <i class="bi bi-calendar3 me-1"></i>
      <?php
        if(isset($_GET["fechaInicial"])){
          echo htmlspecialchars($_GET["fechaInicial"])." - ".htmlspecialchars($_GET["fechaFinal"]);
        } else {
          echo 'Rango de fecha';
        }
      ?>
      <i class="bi bi-caret-down-fill ms-1"></i>
    </button>

    <!-- Botón descargar Excel -->
    <?php
      $urlBase = "vistas/modulos/descargar-reporte.php?reporte=reporte";
      if(isset($_GET["fechaInicial"])){
        $urlBase .= "&fechaInicial=".urlencode($_GET["fechaInicial"])."&fechaFinal=".urlencode($_GET["fechaFinal"]);
      }
    ?>
    <a href="<?= $urlBase ?>" class="btn btn-success btn-sm ms-auto">
      <i class="bi bi-file-earmark-excel me-1"></i>Descargar reporte Excel
    </a>

  </div>
</div>

<!-- Gráficas -->
<div class="row g-4">

  <!-- Gráfica de ventas (ancho completo) -->
  <div class="col-12">
    <?php include "reportes/grafico-ventas.php"; ?>
  </div>

  <!-- Productos más vendidos -->
  <div class="col-md-6">
    <?php include "reportes/productos-mas-vendidos.php"; ?>
  </div>

  <!-- Vendedores -->
  <div class="col-md-6">
    <?php include "reportes/vendedores.php"; ?>
  </div>

  <!-- Compradores -->
  <div class="col-md-6">
    <?php include "reportes/compradores.php"; ?>
  </div>

</div>
