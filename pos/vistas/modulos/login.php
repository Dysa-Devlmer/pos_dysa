<!-- LOGIN PAGE — Bootstrap 5 + AdminLTE 4 -->
<style>
  body.login-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Source Sans 3', sans-serif;
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    animation: slideUp 0.5s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-logo {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-logo img {
    height: 70px;
    width: auto;
    filter: drop-shadow(0 4px 12px rgba(255,255,255,0.2));
  }

  .login-title {
    color: #fff;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 0.25rem;
  }

  .login-subtitle {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-card .form-label {
    color: rgba(255,255,255,0.8);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .login-card .form-control {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    color: #fff;
    padding: 0.7rem 1rem 0.7rem 2.8rem;
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }

  .login-card .form-control:focus {
    background: rgba(255,255,255,0.12);
    border-color: #4dabf7;
    box-shadow: 0 0 0 3px rgba(77,171,247,0.2);
    color: #fff;
    outline: none;
  }

  .login-card .form-control::placeholder { color: rgba(255,255,255,0.35); }

  .input-icon {
    position: relative;
  }

  .input-icon .bi {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
    z-index: 5;
    pointer-events: none;
  }

  .btn-login {
    width: 100%;
    padding: 0.8rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 1rem;
    background: linear-gradient(135deg, #4dabf7, #339af0);
    border: none;
    color: #fff;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(77,171,247,0.4);
    margin-top: 0.5rem;
  }

  .btn-login:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(77,171,247,0.5);
    background: linear-gradient(135deg, #339af0, #1c7ed6);
    color: #fff;
  }

  .btn-login:active { transform: translateY(0); }

  .alert-login {
    background: rgba(220,53,69,0.15);
    border: 1px solid rgba(220,53,69,0.3);
    border-radius: 10px;
    color: #ff8fa3;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .login-footer {
    text-align: center;
    margin-top: 1.5rem;
    color: rgba(255,255,255,0.3);
    font-size: 0.78rem;
  }
</style>

<div class="login-page">
  <div class="login-card">

    <!-- Logo -->
    <div class="login-logo">
      <img src="vistas/img/plantilla/logo-blanco-bloque.png" alt="Sistema POS">
    </div>

    <div class="login-title">Sistema POS</div>
    <div class="login-subtitle">Ingresa tus credenciales para continuar</div>

    <?php
      /* Procesar login y capturar mensaje de error */
      $loginCtrl = new ControladorUsuarios();
      ob_start();
      $loginCtrl->ctrIngresoUsuario();
      $mensajeLogin = ob_get_clean();
    ?>

    <?php if(!empty(trim($mensajeLogin))): ?>
      <div class="alert-login">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <?= htmlspecialchars(trim($mensajeLogin)) ?>
      </div>
    <?php endif; ?>

    <form method="post" autocomplete="off">

      <!-- Usuario -->
      <div class="mb-3">
        <label class="form-label">Usuario</label>
        <div class="input-icon">
          <i class="bi bi-person-fill"></i>
          <input type="text"
                 class="form-control"
                 name="ingUsuario"
                 placeholder="Ingresa tu usuario"
                 autocomplete="username"
                 required>
        </div>
      </div>

      <!-- Contraseña -->
      <div class="mb-3">
        <label class="form-label">Contraseña</label>
        <div class="input-icon">
          <i class="bi bi-lock-fill"></i>
          <input type="password"
                 class="form-control"
                 name="ingPassword"
                 placeholder="••••••••"
                 autocomplete="current-password"
                 required>
        </div>
      </div>

      <button type="submit" class="btn btn-login">
        <i class="bi bi-box-arrow-in-right me-2"></i>Ingresar al sistema
      </button>

    </form>

    <div class="login-footer">
      Sistema POS &copy; <?= date('Y') ?> &nbsp;·&nbsp; v2.0
    </div>

  </div>
</div>
