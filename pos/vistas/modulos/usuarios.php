<?php

if($_SESSION["perfil"] == "Especial" || $_SESSION["perfil"] == "Vendedor"){
  echo '<script>window.location = "inicio";</script>';
  return;
}

?>

<!-- Breadcrumb -->
<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h4 class="fw-bold mb-0">Usuarios</h4>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item"><a href="inicio"><i class="bi bi-house-door"></i> Inicio</a></li>
        <li class="breadcrumb-item active">Administrar usuarios</li>
      </ol>
    </nav>
  </div>
</div>

<!-- Tarjeta principal -->
<div class="card shadow-sm">

  <div class="card-header d-flex align-items-center gap-2">
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalAgregarUsuario">
      <i class="bi bi-person-plus me-1"></i> Agregar usuario
    </button>
  </div>

  <div class="card-body p-0">

    <table class="table table-bordered table-striped table-hover dt-responsive tablas w-100 mb-0">
      <thead class="table-light">
        <tr>
          <th style="width:50px">#</th>
          <th>Nombre</th>
          <th>Usuario</th>
          <th style="width:60px">Foto</th>
          <th>Perfil</th>
          <th>Estado</th>
          <th>Último login</th>
          <th style="width:100px">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <?php
          $usuarios = ControladorUsuarios::ctrMostrarUsuarios(null, null);
          foreach ($usuarios as $key => $value):
        ?>
        <tr>
          <td><?= $key + 1 ?></td>
          <td><?= htmlspecialchars($value["nombre"]) ?></td>
          <td><?= htmlspecialchars($value["usuario"]) ?></td>
          <td>
            <?php $foto = !empty($value["foto"]) ? $value["foto"] : "vistas/img/usuarios/default/anonymous.png"; ?>
            <img src="<?= htmlspecialchars($foto) ?>" class="rounded-circle border" style="width:38px;height:38px;object-fit:cover;">
          </td>
          <td>
            <span class="badge bg-<?= $value["perfil"] === 'Administrador' ? 'primary' : ($value["perfil"] === 'Especial' ? 'info' : 'secondary') ?>">
              <?= htmlspecialchars($value["perfil"]) ?>
            </span>
          </td>
          <td>
            <?php if($value["estado"] != 0): ?>
            <button class="btn btn-success btn-sm btnActivar" idUsuario="<?= $value["id"] ?>" estadoUsuario="0">
              <i class="bi bi-check-circle me-1"></i>Activo
            </button>
            <?php else: ?>
            <button class="btn btn-danger btn-sm btnActivar" idUsuario="<?= $value["id"] ?>" estadoUsuario="1">
              <i class="bi bi-x-circle me-1"></i>Inactivo
            </button>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars($value["ultimo_login"]) ?></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-warning btnEditarUsuario"
                      idUsuario="<?= $value["id"] ?>"
                      data-bs-toggle="modal"
                      data-bs-target="#modalEditarUsuario">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button class="btn btn-danger btnEliminarUsuario"
                      idUsuario="<?= $value["id"] ?>"
                      fotoUsuario="<?= htmlspecialchars($value["foto"]) ?>"
                      usuario="<?= htmlspecialchars($value["usuario"]) ?>">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

  </div>
</div>

<!--=====================================
MODAL AGREGAR USUARIO
======================================-->
<div id="modalAgregarUsuario" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post" enctype="multipart/form-data">

        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>Agregar usuario</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <!-- Nombre -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" name="nuevoNombre" placeholder="Nombre completo" required>
              </div>
            </div>

            <!-- Usuario -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key"></i></span>
                <input type="text" class="form-control" name="nuevoUsuario" id="nuevoUsuario" placeholder="Nombre de usuario" required>
              </div>
            </div>

            <!-- Contraseña -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control" name="nuevoPassword" placeholder="Contraseña" required>
              </div>
            </div>

            <!-- Perfil -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-people"></i></span>
                <select class="form-select" name="nuevoPerfil">
                  <option value="">Seleccionar perfil</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Especial">Especial</option>
                  <option value="Vendedor">Vendedor</option>
                </select>
              </div>
            </div>

            <!-- Foto -->
            <div class="col-12">
              <p class="fw-semibold mb-1 text-muted small"><i class="bi bi-camera me-1"></i>SUBIR FOTO</p>
              <input type="file" class="form-control nuevaFoto" name="nuevaFoto">
              <div class="form-text">Peso máximo 2MB</div>
              <img src="vistas/img/usuarios/default/anonymous.png" class="rounded-circle border mt-2 previsualizar" style="width:80px;height:80px;object-fit:cover;">
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-floppy me-1"></i>Guardar usuario
          </button>
        </div>

        <?php ControladorUsuarios::ctrCrearUsuario(); ?>

      </form>
    </div>
  </div>
</div>

<!--=====================================
MODAL EDITAR USUARIO
======================================-->
<div id="modalEditarUsuario" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form method="post" enctype="multipart/form-data">

        <div class="modal-header bg-warning">
          <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar usuario</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div class="row g-3">

            <!-- Nombre -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" id="editarNombre" name="editarNombre" required>
              </div>
            </div>

            <!-- Usuario (readonly) -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key"></i></span>
                <input type="text" class="form-control" id="editarUsuario" name="editarUsuario" readonly>
              </div>
            </div>

            <!-- Contraseña nueva -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control" name="editarPassword" placeholder="Nueva contraseña (dejar en blanco para no cambiar)">
                <input type="hidden" id="passwordActual" name="passwordActual">
              </div>
            </div>

            <!-- Perfil -->
            <div class="col-md-6">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-people"></i></span>
                <select class="form-select" name="editarPerfil">
                  <option value="" id="editarPerfil"></option>
                  <option value="Administrador">Administrador</option>
                  <option value="Especial">Especial</option>
                  <option value="Vendedor">Vendedor</option>
                </select>
              </div>
            </div>

            <!-- Foto -->
            <div class="col-12">
              <p class="fw-semibold mb-1 text-muted small"><i class="bi bi-camera me-1"></i>SUBIR FOTO</p>
              <input type="file" class="form-control nuevaFoto" name="editarFoto">
              <div class="form-text">Peso máximo 2MB</div>
              <img src="vistas/img/usuarios/default/anonymous.png" class="rounded-circle border mt-2 previsualizarEditar" style="width:80px;height:80px;object-fit:cover;">
              <input type="hidden" name="fotoActual" id="fotoActual">
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>Salir
          </button>
          <button type="submit" class="btn btn-warning">
            <i class="bi bi-floppy me-1"></i>Modificar usuario
          </button>
        </div>

        <?php ControladorUsuarios::ctrEditarUsuario(); ?>

      </form>
    </div>
  </div>
</div>

<?php ControladorUsuarios::ctrBorrarUsuario(); ?>
