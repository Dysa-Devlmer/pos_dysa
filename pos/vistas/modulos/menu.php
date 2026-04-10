<aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">

  <!--begin::Sidebar Brand-->
  <div class="sidebar-brand">
    <a href="inicio" class="brand-link d-flex align-items-center gap-2 px-3 py-3">
      <img src="vistas/img/plantilla/icono-blanco.png"
           alt="POS Logo"
           class="brand-image opacity-90"
           style="height:32px; width:auto;">
      <span class="brand-text fw-semibold fs-6 text-white">Sistema POS</span>
    </a>
  </div>
  <!--end::Sidebar Brand-->

  <!--begin::Sidebar Wrapper-->
  <div class="sidebar-wrapper">
    <nav class="mt-1" aria-label="Menú principal">
      <ul class="nav sidebar-menu flex-column"
          data-lte-toggle="treeview"
          role="navigation"
          data-accordion="false"
          id="navigation">

        <?php if($_SESSION["perfil"] == "Administrador"): ?>

          <li class="nav-item">
            <a href="inicio" class="nav-link <?= (!isset($_GET['ruta']) || $_GET['ruta'] == 'inicio') ? 'active' : '' ?>">
              <i class="nav-icon bi bi-speedometer2"></i>
              <p>Dashboard</p>
            </a>
          </li>

          <li class="nav-item">
            <a href="usuarios" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'usuarios') ? 'active' : '' ?>">
              <i class="nav-icon bi bi-people-fill"></i>
              <p>Usuarios</p>
            </a>
          </li>

        <?php endif; ?>

        <?php if($_SESSION["perfil"] == "Administrador" || $_SESSION["perfil"] == "Especial"): ?>

          <li class="nav-item">
            <a href="#" class="nav-link <?= (isset($_GET['ruta']) && in_array($_GET['ruta'], ['categorias','productos'])) ? 'active' : '' ?>">
              <i class="nav-icon bi bi-grid-1x2-fill"></i>
              <p>Catálogo <i class="nav-arrow bi bi-chevron-right"></i></p>
            </a>
            <ul class="nav nav-treeview ms-1">
              <li class="nav-item">
                <a href="categorias" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'categorias') ? 'active' : '' ?>">
                  <i class="nav-icon bi bi-tags-fill"></i>
                  <p>Categorías</p>
                </a>
              </li>
              <li class="nav-item">
                <a href="productos" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'productos') ? 'active' : '' ?>">
                  <i class="nav-icon bi bi-box-seam-fill"></i>
                  <p>Productos</p>
                </a>
              </li>
            </ul>
          </li>

        <?php endif; ?>

        <?php if($_SESSION["perfil"] == "Administrador" || $_SESSION["perfil"] == "Vendedor"): ?>

          <li class="nav-item">
            <a href="clientes" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'clientes') ? 'active' : '' ?>">
              <i class="nav-icon bi bi-person-vcard-fill"></i>
              <p>Clientes</p>
            </a>
          </li>

          <li class="nav-item">
            <a href="#" class="nav-link <?= (isset($_GET['ruta']) && in_array($_GET['ruta'], ['ventas','crear-venta','editar-venta','reportes'])) ? 'active' : '' ?>">
              <i class="nav-icon bi bi-cart-fill"></i>
              <p>Ventas <i class="nav-arrow bi bi-chevron-right"></i></p>
            </a>
            <ul class="nav nav-treeview ms-1">
              <li class="nav-item">
                <a href="ventas" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'ventas') ? 'active' : '' ?>">
                  <i class="nav-icon bi bi-list-ul"></i>
                  <p>Administrar ventas</p>
                </a>
              </li>
              <li class="nav-item">
                <a href="crear-venta" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'crear-venta') ? 'active' : '' ?>">
                  <i class="nav-icon bi bi-plus-circle-fill"></i>
                  <p>Crear venta</p>
                </a>
              </li>
              <?php if($_SESSION["perfil"] == "Administrador"): ?>
              <li class="nav-item">
                <a href="reportes" class="nav-link <?= (isset($_GET['ruta']) && $_GET['ruta'] == 'reportes') ? 'active' : '' ?>">
                  <i class="nav-icon bi bi-bar-chart-fill"></i>
                  <p>Reportes</p>
                </a>
              </li>
              <?php endif; ?>
            </ul>
          </li>

        <?php endif; ?>

      </ul>
    </nav>
  </div>
  <!--end::Sidebar Wrapper-->

</aside>