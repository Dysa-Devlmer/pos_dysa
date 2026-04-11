<?php

if($_SESSION["perfil"] == "Especial"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

$xml = ControladorVentas::ctrDescargarXML();

if($xml){
  rename($_GET["xml"].".xml", "xml/".$_GET["xml"].".xml");
  echo '<div class="alert alert-success alert-dismissible fade show mb-4" role="alert">
    <i class="bi bi-file-earmark-code me-2"></i>
    Se ha creado correctamente el archivo XML.
    <a class="alert-link ms-2 abrirXML" archivo="xml/'.$_GET["xml"].'.xml" href="ventas">Ver ventas</a>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>';
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Ventas</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Administrar ventas</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Tarjeta principal -->
<div class="card shadow-sm">

  <div class="card-header d-flex flex-wrap align-items-center gap-2">

    <a href="crear-venta" class="btn btn-primary btn-sm">
      <i class="bi bi-plus-circle me-1"></i> Agregar venta
    </a>

    <div class="ms-auto d-flex align-items-center gap-2">
      <button type="button" class="btn btn-outline-secondary btn-sm" id="daterange-btn">
        <i class="bi bi-calendar3 me-1"></i>
        <span class="rango-texto">
          <?php
            if(isset($_GET["fechaInicial"])){
              echo htmlspecialchars($_GET["fechaInicial"])." → ".htmlspecialchars($_GET["fechaFinal"]);
            } else {
              echo 'Rango de fecha';
            }
          ?>
        </span>
        <i class="bi bi-caret-down-fill ms-1"></i>
      </button>
      <?php if(isset($_GET["fechaInicial"])): ?>
      <a href="ventas" id="btnLimpiarFechaVentas" class="btn btn-outline-danger btn-sm" title="Quitar filtro">
        <i class="bi bi-x-lg"></i>
      </a>
      <?php endif; ?>
    </div>

  </div>

  <div class="card-body p-0">

    <table class="table table-bordered table-striped table-hover dt-responsive tablas w-100 mb-0">
      <thead class="table-light">
        <tr>
          <th style="width:50px">#</th>
          <th>Código factura</th>
          <th>Cliente</th>
          <th>Vendedor</th>
          <th>Forma de pago</th>
          <th>Neto</th>
          <th>Total</th>
          <th>Fecha</th>
          <th style="width:140px">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <?php
          $fechaInicial = isset($_GET["fechaInicial"]) ? $_GET["fechaInicial"] : null;
          $fechaFinal   = isset($_GET["fechaFinal"])   ? $_GET["fechaFinal"]   : null;

          $respuesta = ControladorVentas::ctrRangoFechasVentas($fechaInicial, $fechaFinal);

          foreach ($respuesta as $key => $value):
            $cliente = ControladorClientes::ctrMostrarClientes("id", $value["id_cliente"]);
            $vendedor = ControladorUsuarios::ctrMostrarUsuarios("id", $value["id_vendedor"]);
        ?>
        <tr>
          <td><?= $key + 1 ?></td>
          <td><code><?= htmlspecialchars($value["codigo"]) ?></code></td>
          <td><?= htmlspecialchars($cliente["nombre"] ?? '-') ?></td>
          <td><?= htmlspecialchars($vendedor["nombre"] ?? '-') ?></td>
          <td>
            <span class="badge bg-<?= $value["metodo_pago"] === 'Efectivo' ? 'success' : 'info' ?>">
              <?= htmlspecialchars($value["metodo_pago"]) ?>
            </span>
          </td>
          <td>$ <?= number_format($value["neto"], 2) ?></td>
          <td><strong>$ <?= number_format($value["total"], 2) ?></strong></td>
          <td><?= htmlspecialchars($value["fecha"]) ?></td>
          <td>
            <div class="btn-group btn-group-sm">
              <a class="btn btn-outline-secondary" href="index.php?ruta=ventas&xml=<?= $value["codigo"] ?>">
                <i class="bi bi-file-earmark-code"></i>
              </a>
              <button class="btn btn-info btnImprimirFactura" codigoVenta="<?= $value["codigo"] ?>">
                <i class="bi bi-printer"></i>
              </button>
              <?php if($_SESSION["perfil"] == "Administrador"): ?>
              <button class="btn btn-warning btnEditarVenta" idVenta="<?= $value["id"] ?>">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button class="btn btn-danger btnEliminarVenta" idVenta="<?= $value["id"] ?>">
                <i class="bi bi-x-lg"></i>
              </button>
              <?php endif; ?>
            </div>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

    <?php ControladorVentas::ctrEliminarVenta(); ?>

  </div>
</div>
