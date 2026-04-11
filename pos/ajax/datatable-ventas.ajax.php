<?php

header('Content-Type: application/json; charset=utf-8');

require_once "../controladores/productos.controlador.php";
require_once "../modelos/productos.modelo.php";

/*=============================================
MOSTRAR TABLA DE PRODUCTOS PARA CREAR VENTA
— Devuelve JSON compatible con DataTables 2.x
=============================================*/

$item  = null;
$valor = null;
$orden = "id";

$productos = ControladorProductos::ctrMostrarProductos($item, $valor, $orden);

if (!$productos || count($productos) === 0) {
    echo json_encode(["data" => []]);
    exit;
}

$data = [];

foreach ($productos as $i => $producto) {

    /*=============================================
    IMAGEN
    =============================================*/
    $imagen = "<img src='" . htmlspecialchars($producto["imagen"]) . "' width='40' class='rounded shadow-sm'>";

    /*=============================================
    BADGE DE STOCK — colores semánticos BS5
    =============================================*/
    $stock = (int) $producto["stock"];

    if ($stock === 0) {
        $stockHtml = "<span class='badge bg-danger'>Sin stock</span>";
    } elseif ($stock <= 5) {
        $stockHtml = "<span class='badge bg-danger'>" . $stock . "</span>";
    } elseif ($stock <= 15) {
        $stockHtml = "<span class='badge bg-warning text-dark'>" . $stock . "</span>";
    } else {
        $stockHtml = "<span class='badge bg-success'>" . $stock . "</span>";
    }

    /*=============================================
    BOTÓN AGREGAR
    =============================================*/
    $boton = "<button class='btn btn-sm btn-primary agregarProducto recuperarBoton' "
           . "idProducto='" . (int) $producto["id"] . "'>"
           . "<i class='bi bi-plus-lg me-1'></i>Agregar"
           . "</button>";

    $data[] = [
        (string) ($i + 1),
        $imagen,
        htmlspecialchars($producto["codigo"]),
        htmlspecialchars($producto["descripcion"]),
        $stockHtml,
        $boton
    ];
}

echo json_encode(["data" => $data], JSON_UNESCAPED_UNICODE);
