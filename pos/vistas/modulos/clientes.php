<?php

if($_SESSION["perfil"] == "Especial"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Clientes</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Administrar clientes</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Tarjeta principal -->
<div class="card shadow-sm">

  <div class="card-header d-flex align-items-center gap-2">
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalAgregarCliente">
      <i class="bi bi-plus-circle me-1"></i> Agregar cliente
    </button>
  </div>

  <div class="card-body p-0">

    <table class="table table-bordered table-striped table-hover dt-responsive tablas w-100 mb-0">
      <thead class="table-light">
        <tr>
          <th style="width:50px">#</th>
          <th>Nombre</th>
          <th>Documento ID</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Dirección</th>
          <th>F. nacimiento</th>
          <th>Compras</th>
          <th>Última compra</th>
          <th>Ingreso</th>
          <th style="width:100px">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <?php
          $clientes = ControladorClientes::ctrMostrarClientes(null, null);
          foreach ($clientes as $key => $value):
        ?>
        <tr>
          <td><?= $key + 1 ?></td>
          <td><?= htmlspecialchars($value["nombre"]) ?></td>
          <td><?= htmlspecialchars($value["documento"]) ?></td>
          <td><?= htmlspecialchars($value["email"]) ?></td>
          <td><?= htmlspecialchars($value["telefono"]) ?></td>
          <td><?= htmlspecialchars($value["direccion"]) ?></td>
          <td><?= htmlspecialchars($value["fecha_nacimiento"]) ?></td>
          <td><?= htmlspecialchars($value["compras"]) ?></td>
          <td><?= htmlspecialchars($value["ultima_compra"]) ?></td>
          <td><?= htmlspecialchars($value["fecha"]) ?></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-warning btnEditarCliente"
                      data-bs-toggle="modal"
                      data-bs-target="#modalEditarCliente"
                      idCliente="<?= $value["id"] ?>">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <?php if($_SESSION["perfil"] == "Administrador"): ?>
              <button class="btn btn-danger btnEliminarCliente" idCliente="<?= $value["id"] ?>">
                <i class="bi bi-x-lg"></i>
              </button>
              <?php endif; ?>
            </div>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

  </div>
</div>

<!--=====================================
MODAL AGREGAR CLIENTE
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

            <!-- Nombre -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" name="nuevoCliente" placeholder="Nombre completo" required>
              </div>
            </div>

            <!-- Documento ID -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key"></i></span>
                <input type="number" min="0" class="form-control" name="nuevoDocumentoId" placeholder="Documento de identidad" required>
              </div>
            </div>

            <!-- Email -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" name="nuevoEmail" placeholder="Correo electrónico" required>
              </div>
            </div>

            <!-- Teléfono -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                <input type="text" class="form-control" name="nuevoTelefono" placeholder="(999) 999-9999"
                       data-inputmask="'mask':'(999) 999-9999'" data-mask required>
              </div>
            </div>

            <!-- Dirección -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
                <input type="text" class="form-control" name="nuevaDireccion" placeholder="Dirección" required>
              </div>
            </div>

            <!-- Fecha de nacimiento -->
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

<!--=====================================
MODAL EDITAR CLIENTE
======================================-->
<div id="modalEditarCliente" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post">

        <div class="modal-header bg-warning">
          <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar cliente</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <!-- Nombre -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" name="editarCliente" id="editarCliente" required>
                <input type="hidden" id="idCliente" name="idCliente">
              </div>
            </div>

            <!-- Documento ID -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key"></i></span>
                <input type="number" min="0" class="form-control" name="editarDocumentoId" id="editarDocumentoId" required>
              </div>
            </div>

            <!-- Email -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" name="editarEmail" id="editarEmail" required>
              </div>
            </div>

            <!-- Teléfono -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                <input type="text" class="form-control" name="editarTelefono" id="editarTelefono"
                       data-inputmask="'mask':'(999) 999-9999'" data-mask required>
              </div>
            </div>

            <!-- Dirección -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
                <input type="text" class="form-control" name="editarDireccion" id="editarDireccion" required>
              </div>
            </div>

            <!-- Fecha nacimiento -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-calendar3"></i></span>
                <input type="text" class="form-control" name="editarFechaNacimiento" id="editarFechaNacimiento"
                       data-inputmask="'alias': 'yyyy/mm/dd'" data-mask required>
              </div>
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

      <?php ControladorClientes::ctrEditarCliente(); ?>

    </div>
  </div>
</div>

<?php ControladorClientes::ctrEliminarCliente(); ?>
