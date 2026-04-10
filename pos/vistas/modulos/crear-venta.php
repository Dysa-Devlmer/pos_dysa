<?php

if($_SESSION["perfil"] == "Especial"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Crear venta</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item"><a href="ventas">Ventas</a></li>
        <li class="breadcrumb-item active">Nueva venta</li>
      </ol>
    </nav>
  </div>
</div>

<div class="row g-4">

  <!--=====================================
  COLUMNA IZQUIERDA: FORMULARIO DE VENTA
  ======================================-->

  <div class="col-lg-5">

    <div class="card shadow-sm border-success">

      <div class="card-header bg-success text-white">
        <i class="bi bi-cart-plus me-2"></i><strong>Nueva venta</strong>
      </div>

      <form method="post" class="formularioVenta">

        <div class="card-body">

          <div class="row g-3">

            <!-- Vendedor (readonly) -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                <input type="text" class="form-control" id="nuevoVendedor"
                       value="<?= htmlspecialchars($_SESSION["nombre"]) ?>" readonly>
                <input type="hidden" name="idVendedor" value="<?= $_SESSION["id"] ?>">
              </div>
            </div>

            <!-- Código de factura (readonly) -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-hash"></i></span>
                <?php
                  $ventas = ControladorVentas::ctrMostrarVentas(null, null);
                  if(!$ventas){
                    $codigo = 10001;
                  } else {
                    foreach($ventas as $v){}
                    $codigo = $v["codigo"] + 1;
                  }
                ?>
                <input type="text" class="form-control" id="nuevaVenta" name="nuevaVenta"
                       value="<?= $codigo ?>" readonly>
              </div>
            </div>

            <!-- Cliente -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-people"></i></span>
                <select class="form-select" id="seleccionarCliente" name="seleccionarCliente" required>
                  <option value="">Seleccionar cliente</option>
                  <?php
                    $clientes = ControladorClientes::ctrMostrarClientes(null, null);
                    foreach ($clientes as $cl):
                  ?>
                  <option value="<?= $cl["id"] ?>"><?= htmlspecialchars($cl["nombre"]) ?></option>
                  <?php endforeach; ?>
                </select>
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        data-bs-toggle="modal" data-bs-target="#modalAgregarCliente">
                  <i class="bi bi-plus"></i> Cliente
                </button>
              </div>
            </div>

            <!-- Lista de productos seleccionados -->
            <div class="col-12">
              <div class="row g-2 nuevoProducto"></div>
              <input type="hidden" id="listaProductos" name="listaProductos">
            </div>

            <!-- Botón agregar producto (visible solo en móvil) -->
            <div class="col-12 d-lg-none">
              <button type="button" class="btn btn-outline-secondary w-100 btnAgregarProducto">
                <i class="bi bi-plus-circle me-1"></i>Agregar producto
              </button>
            </div>

            <div class="col-12"><hr class="my-1"></div>

            <!-- Impuesto y Total -->
            <div class="col-6">
              <label class="form-label small text-muted">Impuesto (%)</label>
              <div class="input-group">
                <input type="number" class="form-control" min="0" id="nuevoImpuestoVenta"
                       name="nuevoImpuestoVenta" placeholder="0" required>
                <span class="input-group-text"><i class="bi bi-percent"></i></span>
                <input type="hidden" name="nuevoPrecioImpuesto" id="nuevoPrecioImpuesto">
                <input type="hidden" name="nuevoPrecioNeto"     id="nuevoPrecioNeto">
              </div>
            </div>

            <div class="col-6">
              <label class="form-label small text-muted">Total</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-currency-dollar"></i></span>
                <input type="text" class="form-control fw-bold" id="nuevoTotalVenta"
                       name="nuevoTotalVenta" total="" placeholder="0.00" readonly required>
                <input type="hidden" name="totalVenta" id="totalVenta">
              </div>
            </div>

            <div class="col-12"><hr class="my-1"></div>

            <!-- Método de pago -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-credit-card"></i></span>
                <select class="form-select" id="nuevoMetodoPago" name="nuevoMetodoPago" required>
                  <option value="">Método de pago</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="TC">Tarjeta Crédito</option>
                  <option value="TD">Tarjeta Débito</option>
                </select>
              </div>
            </div>

            <div class="cajasMetodoPago col-12"></div>
            <input type="hidden" id="listaMetodoPago" name="listaMetodoPago">

          </div>

        </div><!-- /card-body -->

        <div class="card-footer d-flex align-items-center justify-content-between">
          <div class="form-check">
            <input type="checkbox" class="form-check-input" id="chkImpresion" name="impresion" value="1" checked>
            <label class="form-check-label" for="chkImpresion">Imprimir ticket</label>
          </div>
          <button type="submit" class="btn btn-success">
            <i class="bi bi-floppy me-1"></i>Guardar venta
          </button>
        </div>

      </form>

      <?php ControladorVentas::ctrCrearVenta(); ?>

    </div>

  </div>

  <!--=====================================
  COLUMNA DERECHA: TABLA DE PRODUCTOS
  ======================================-->

  <div class="col-lg-7 d-none d-lg-block">

    <div class="card shadow-sm border-warning">

      <div class="card-header bg-warning">
        <i class="bi bi-box-seam me-2"></i><strong>Catálogo de productos</strong>
      </div>

      <div class="card-body p-0">

        <table class="table table-bordered table-striped table-hover dt-responsive tablaVentas mb-0">
          <thead class="table-light">
            <tr>
              <th style="width:40px">#</th>
              <th style="width:60px">Imagen</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Stock</th>
              <th style="width:80px">Acciones</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>

      </div>
    </div>

  </div>

</div>

<!--=====================================
MODAL AGREGAR CLIENTE (desde crear-venta)
======================================-->
<div id="modalAgregarCliente" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post">

        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>Agregar cliente</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" name="nuevoCliente" placeholder="Nombre completo" required>
              </div>
            </div>

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key"></i></span>
                <input type="number" min="0" class="form-control" name="nuevoDocumentoId" placeholder="Documento de identidad" required>
              </div>
            </div>

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" name="nuevoEmail" placeholder="Correo electrónico" required>
              </div>
            </div>

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                <input type="text" class="form-control" name="nuevoTelefono" placeholder="(999) 999-9999"
                       data-inputmask="'mask':'(999) 999-9999'" data-mask required>
              </div>
            </div>

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
                <input type="text" class="form-control" name="nuevaDireccion" placeholder="Dirección" required>
              </div>
            </div>

            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-calendar3"></i></span>
                <input type="text" class="form-control" name="nuevaFechaNacimiento" placeholder="aaaa/mm/dd"
                       data-inputmask="'alias': 'yyyy/mm/dd'" data-mask required>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-floppy me-1"></i>Guardar cliente
          </button>
        </div>

      </form>

      <?php ControladorClientes::ctrCrearCliente(); ?>

    </div>
  </div>
</div>
