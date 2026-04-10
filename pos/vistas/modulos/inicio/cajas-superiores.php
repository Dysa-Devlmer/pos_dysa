<?php
$item  = null;
$valor = null;
$orden = "id";

$ventas          = ControladorVentas::ctrSumaTotalVentas();
$categorias      = ControladorCategorias::ctrMostrarCategorias($item, $valor);
$totalCategorias = count($categorias);
$clientes        = ControladorClientes::ctrMostrarClientes($item, $valor);
$totalClientes   = count($clientes);
$productos       = ControladorProductos::ctrMostrarProductos($item, $valor, $orden);
$totalProductos  = count($productos);
?>

<!-- Ventas totales -->
<div class="col-sm-6 col-xl-3">
  <div class="card border-0 shadow-sm h-100" style="border-radius:14px; background: linear-gradient(135deg,#4dabf7,#339af0);">
    <div class="card-body text-white d-flex align-items-center justify-content-between p-4">
      <div>
        <div class="small fw-semibold text-white-50 mb-1 text-uppercase" style="letter-spacing:.5px;">Ventas Totales</div>
        <div class="fs-4 fw-bold">$<?= number_format($ventas["total"] ?? 0, 2) ?></div>
      </div>
      <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:52px;height:52px;background:rgba(255,255,255,.2);">
        <i class="bi bi-currency-dollar fs-4"></i>
      </div>
    </div>
    <a href="ventas" class="card-footer text-white-75 small text-decoration-none d-flex justify-content-between align-items-center px-4 py-2" style="background:rgba(0,0,0,.1);border-radius:0 0 14px 14px;">
      Ver ventas <i class="bi bi-arrow-right"></i>
    </a>
  </div>
</div>

<!-- Categorías -->
<div class="col-sm-6 col-xl-3">
  <div class="card border-0 shadow-sm h-100" style="border-radius:14px; background: linear-gradient(135deg,#51cf66,#40c057);">
    <div class="card-body text-white d-flex align-items-center justify-content-between p-4">
      <div>
        <div class="small fw-semibold text-white-50 mb-1 text-uppercase" style="letter-spacing:.5px;">Categorías</div>
        <div class="fs-4 fw-bold"><?= number_format($totalCategorias) ?></div>
      </div>
      <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:52px;height:52px;background:rgba(255,255,255,.2);">
        <i class="bi bi-tags-fill fs-4"></i>
      </div>
    </div>
    <a href="categorias" class="card-footer text-white-75 small text-decoration-none d-flex justify-content-between align-items-center px-4 py-2" style="background:rgba(0,0,0,.1);border-radius:0 0 14px 14px;">
      Ver categorías <i class="bi bi-arrow-right"></i>
    </a>
  </div>
</div>

<!-- Clientes -->
<div class="col-sm-6 col-xl-3">
  <div class="card border-0 shadow-sm h-100" style="border-radius:14px; background: linear-gradient(135deg,#fcc419,#f59f00);">
    <div class="card-body text-white d-flex align-items-center justify-content-between p-4">
      <div>
        <div class="small fw-semibold text-white-50 mb-1 text-uppercase" style="letter-spacing:.5px;">Clientes</div>
        <div class="fs-4 fw-bold"><?= number_format($totalClientes) ?></div>
      </div>
      <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:52px;height:52px;background:rgba(255,255,255,.2);">
        <i class="bi bi-people-fill fs-4"></i>
      </div>
    </div>
    <a href="clientes" class="card-footer text-white-75 small text-decoration-none d-flex justify-content-between align-items-center px-4 py-2" style="background:rgba(0,0,0,.1);border-radius:0 0 14px 14px;">
      Ver clientes <i class="bi bi-arrow-right"></i>
    </a>
  </div>
</div>

<!-- Productos -->
<div class="col-sm-6 col-xl-3">
  <div class="card border-0 shadow-sm h-100" style="border-radius:14px; background: linear-gradient(135deg,#f03e3e,#e03131);">
    <div class="card-body text-white d-flex align-items-center justify-content-between p-4">
      <div>
        <div class="small fw-semibold text-white-50 mb-1 text-uppercase" style="letter-spacing:.5px;">Productos</div>
        <div class="fs-4 fw-bold"><?= number_format($totalProductos) ?></div>
      </div>
      <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:52px;height:52px;background:rgba(255,255,255,.2);">
        <i class="bi bi-box-seam-fill fs-4"></i>
      </div>
    </div>
    <a href="productos" class="card-footer text-white-75 small text-decoration-none d-flex justify-content-between align-items-center px-4 py-2" style="background:rgba(0,0,0,.1);border-radius:0 0 14px 14px;">
      Ver productos <i class="bi bi-arrow-right"></i>
    </a>
  </div>
</div>
