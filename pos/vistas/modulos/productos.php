<?php

if($_SESSION["perfil"] == "Vendedor"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Productos</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Administrar productos</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Tarjeta principal -->
<div class="card shadow-sm">

  <div class="card-header d-flex align-items-center gap-2">
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalAgregarProducto">
      <i class="bi bi-plus-circle me-1"></i> Agregar producto
    </button>
  </div>

  <div class="card-body p-0">

    <table class="table table-bordered table-striped table-hover dt-responsive tablaProductos w-100 mb-0">
      <thead class="table-light">
        <tr>
          <th style="width:50px">#</th>
          <th style="width:80px">Imagen</th>
          <th>Código</th>
          <th>Descripción</th>
          <th>Categoría</th>
          <th>Stock</th>
          <th>P. Compra</th>
          <th>P. Venta</th>
          <th>Agregado</th>
          <th style="width:100px">Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <input type="hidden" value="<?= $_SESSION['perfil'] ?>" id="perfilOculto">

  </div>
</div>

<!--=====================================
MODAL AGREGAR PRODUCTO
======================================-->
<div id="modalAgregarProducto" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post" enctype="multipart/form-data">

        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="bi bi-box me-2"></i>Agregar producto</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <!-- Categoría -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-grid"></i></span>
                <select class="form-select" id="nuevaCategoria" name="nuevaCategoria" required>
                  <option value="">Seleccionar categoría</option>
                  <?php
                    $categorias = ControladorCategorias::ctrMostrarCategorias(null, null);
                    foreach ($categorias as $cat):
                  ?>
                  <option value="<?= $cat["id"] ?>"><?= htmlspecialchars($cat["categoria"]) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
            </div>

            <!-- Código -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
                <input type="text" class="form-control" id="nuevoCodigo" name="nuevoCodigo" placeholder="Código del producto" required>
              </div>
            </div>

            <!-- Descripción -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-box"></i></span>
                <input type="text" class="form-control" name="nuevaDescripcion" placeholder="Descripción del producto" required>
              </div>
            </div>

            <!-- Stock -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-check2"></i></span>
                <input type="number" class="form-control" name="nuevoStock" min="0" placeholder="Stock" required>
              </div>
            </div>

            <!-- Precio compra -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-arrow-up"></i></span>
                <input type="number" class="form-control" id="nuevoPrecioCompra" name="nuevoPrecioCompra"
                       step="any" min="0" placeholder="Precio de compra" required>
              </div>
            </div>

            <!-- Precio venta -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-arrow-down"></i></span>
                <input type="number" class="form-control" id="nuevoPrecioVenta" name="nuevoPrecioVenta"
                       step="any" min="0" placeholder="Precio de venta" required>
              </div>
            </div>

            <!-- Porcentaje -->
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input minimal porcentaje" id="chkPorcentaje" checked>
                <label class="form-check-label" for="chkPorcentaje">Usar porcentaje de ganancia</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="input-group">
                <input type="number" class="form-control nuevoPorcentaje" min="0" value="40" required>
                <span class="input-group-text"><i class="bi bi-percent"></i></span>
              </div>
            </div>

            <!-- Imagen -->
            <div class="col-12">
              <p class="fw-semibold mb-1 text-muted small"><i class="bi bi-image me-1"></i>SUBIR IMAGEN</p>
              <input type="file" class="form-control nuevaImagen" name="nuevaImagen">
              <div class="form-text">Peso máximo de la imagen 2MB</div>
              <img src="vistas/img/productos/default/anonymous.png" class="img-thumbnail previsualizar mt-2" style="width:100px">
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-floppy me-1"></i>Guardar producto
          </button>
        </div>

      </form>

      <?php ControladorProductos::ctrCrearProducto(); ?>

    </div>
  </div>
</div>

<!--=====================================
MODAL EDITAR PRODUCTO
======================================-->
<div id="modalEditarProducto" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post" enctype="multipart/form-data">

        <div class="modal-header bg-warning">
          <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar producto</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <!-- Categoría -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-grid"></i></span>
                <select class="form-select" name="editarCategoria" required>
                  <option id="editarCategoria"></option>
                </select>
              </div>
            </div>

            <!-- Código (readonly) -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
                <input type="text" class="form-control" id="editarCodigo" name="editarCodigo" readonly required>
              </div>
            </div>

            <!-- Descripción -->
            <div class="col-12">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-box"></i></span>
                <input type="text" class="form-control" id="editarDescripcion" name="editarDescripcion" required>
              </div>
            </div>

            <!-- Stock -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-check2"></i></span>
                <input type="number" class="form-control" id="editarStock" name="editarStock" min="0" required>
              </div>
            </div>

            <!-- Precio compra -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-arrow-up"></i></span>
                <input type="number" class="form-control" id="editarPrecioCompra" name="editarPrecioCompra" step="any" min="0" required>
              </div>
            </div>

            <!-- Precio venta -->
            <div class="col-md-4">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-arrow-down"></i></span>
                <input type="number" class="form-control" id="editarPrecioVenta" name="editarPrecioVenta" step="any" min="0" readonly required>
              </div>
            </div>

            <!-- Porcentaje -->
            <div class="col-md-6">
              <div class="form-check">
                <input type="checkbox" class="form-check-input minimal porcentaje" id="chkPorcentajeEditar" checked>
                <label class="form-check-label" for="chkPorcentajeEditar">Usar porcentaje de ganancia</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="input-group">
                <input type="number" class="form-control nuevoPorcentaje" min="0" value="40" required>
                <span class="input-group-text"><i class="bi bi-percent"></i></span>
              </div>
            </div>

            <!-- Imagen -->
            <div class="col-12">
              <p class="fw-semibold mb-1 text-muted small"><i class="bi bi-image me-1"></i>SUBIR IMAGEN</p>
              <input type="file" class="form-control nuevaImagen" name="editarImagen">
              <div class="form-text">Peso máximo de la imagen 2MB</div>
              <img src="vistas/img/productos/default/anonymous.png" class="img-thumbnail previsualizar mt-2" style="width:100px">
              <input type="hidden" name="imagenActual" id="imagenActual">
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-warning">
            <i class="bi bi-floppy me-1"></i>Guardar cambios
          </button>
        </div>

      </form>

      <?php ControladorProductos::ctrEditarProducto(); ?>

    </div>
  </div>
</div>

<?php ControladorProductos::ctrEliminarProducto(); ?>
