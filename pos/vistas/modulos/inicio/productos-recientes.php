<?php

$item = null;
$valor = null;
$orden = "id";

$productos = ControladorProductos::ctrMostrarProductos($item, $valor, $orden);

 ?>


<!-- PRODUCTOS RECIENTES — Bootstrap 5 -->
<div class="card border-0 shadow-sm" style="border-radius:14px;">
  <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between pt-3 pb-0 px-4">
    <div>
      <h6 class="fw-bold mb-0"><i class="bi bi-box-seam text-primary me-2"></i>Productos Recientes</h6>
      <small class="text-muted">Últimos 10 registrados</small>
    </div>
    <a href="productos" class="btn btn-sm btn-outline-primary rounded-pill">Ver todos</a>
  </div>
  <div class="card-body px-4 pb-3">
    <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3 mt-1">
      <?php for($i = 0; $i < min(10, count($productos)); $i++): ?>
      <div class="col">
        <div class="card border-0 bg-light h-100 text-center" style="border-radius:12px;">
          <div class="card-body p-2">
            <img src="<?= htmlspecialchars($productos[$i]["imagen"]) ?>"
                 alt="<?= htmlspecialchars($productos[$i]["descripcion"]) ?>"
                 class="rounded mb-2"
                 style="width:100%;height:70px;object-fit:cover;">
            <div class="small fw-semibold text-truncate" title="<?= htmlspecialchars($productos[$i]["descripcion"]) ?>">
              <?= htmlspecialchars($productos[$i]["descripcion"]) ?>
            </div>
            <div class="text-primary fw-bold small mt-1">
              $<?= number_format($productos[$i]["precio_venta"], 2) ?>
            </div>
            <span class="badge bg-success-subtle text-success mt-1" style="font-size:.7rem;">
              Stock: <?= $productos[$i]["stock"] ?>
            </span>
          </div>
        </div>
      </div>
      <?php endfor; ?>
    </div>
  </div>
</div>
