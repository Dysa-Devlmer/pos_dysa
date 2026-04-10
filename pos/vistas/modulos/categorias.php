<?php

if($_SESSION["perfil"] == "Vendedor"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Categorías</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Administrar categorías</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Tarjeta principal -->
<div class="card shadow-sm">

  <div class="card-header d-flex align-items-center gap-2">
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalAgregarCategoria">
      <i class="bi bi-plus-circle me-1"></i> Agregar categoría
    </button>
  </div>

  <div class="card-body p-0">

    <table class="table table-bordered table-striped table-hover dt-responsive tablas w-100 mb-0">
      <thead class="table-light">
        <tr>
          <th style="width:50px">#</th>
          <th>Categoría</th>
          <th style="width:120px">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <?php
          $categorias = ControladorCategorias::ctrMostrarCategorias(null, null);
          foreach ($categorias as $key => $value):
        ?>
        <tr>
          <td><?= $key + 1 ?></td>
          <td class="text-uppercase"><?= htmlspecialchars($value["categoria"]) ?></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-warning btnEditarCategoria"
                      idCategoria="<?= $value["id"] ?>"
                      data-bs-toggle="modal"
                      data-bs-target="#modalEditarCategoria">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <?php if($_SESSION["perfil"] == "Administrador"): ?>
              <button class="btn btn-danger btnEliminarCategoria" idCategoria="<?= $value["id"] ?>">
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
MODAL AGREGAR CATEGORÍA
======================================-->
<div id="modalAgregarCategoria" class="modal fade" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <form method="post">

        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="bi bi-grid me-2"></i>Agregar categoría</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-grid"></i></span>
            <input type="text" class="form-control" name="nuevaCategoria" placeholder="Nombre de la categoría" required>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-floppy me-1"></i>Guardar categoría
          </button>
        </div>

        <?php ControladorCategorias::ctrCrearCategoria(); ?>

      </form>
    </div>
  </div>
</div>

<!--=====================================
MODAL EDITAR CATEGORÍA
======================================-->
<div id="modalEditarCategoria" class="modal fade" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <form method="post">

        <div class="modal-header bg-warning">
          <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar categoría</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-grid"></i></span>
            <input type="text"   class="form-control" name="editarCategoria" id="editarCategoria" required>
            <input type="hidden" name="idCategoria" id="idCategoria">
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

        <?php ControladorCategorias::ctrEditarCategoria(); ?>

      </form>
    </div>
  </div>
</div>

<?php ControladorCategorias::ctrBorrarCategoria(); ?>
