<?php

/*=============================================
CONFIGURACIÓN DE ERRORES
=============================================*/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error_log');

/*=============================================
CONTROLADORES
=============================================*/
require_once "controladores/plantilla.controlador.php";
require_once "controladores/usuarios.controlador.php";
require_once "controladores/categorias.controlador.php";
require_once "controladores/productos.controlador.php";
require_once "controladores/clientes.controlador.php";
require_once "controladores/ventas.controlador.php";

/*=============================================
MODELOS
=============================================*/
require_once "modelos/usuarios.modelo.php";
require_once "modelos/categorias.modelo.php";
require_once "modelos/productos.modelo.php";
require_once "modelos/clientes.modelo.php";
require_once "modelos/ventas.modelo.php";

/*=============================================
EXTENSIONES (TCPDF via Composer)
=============================================*/
require_once "extensiones/vendor/autoload.php";

/*=============================================
ARRANQUE DE LA APLICACIÓN
=============================================*/
$plantilla = new ControladorPlantilla();
$plantilla->ctrPlantilla();
