<?php

header('Content-Type: application/json; charset=utf-8');

require_once "../controladores/productos.controlador.php";
require_once "../modelos/productos.modelo.php";
require_once "../controladores/categorias.controlador.php";
require_once "../modelos/categorias.modelo.php";

/*=============================================
MOSTRAR TABLA PRINCIPAL DE PRODUCTOS
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

$perfilOculto = isset($_GET["perfilOculto"]) ? $_GET["perfilOculto"] : "";

$data = [];

foreach ($productos as $i => $producto) {

    /*=============================================
    IMAGEN
    =============================================*/
    $imagen = "<img src='" . htmlspecialchars($producto["imagen"]) . "' width='44' class='rounded shadow-sm'>";

    /*=============================================
    CATEGORÍA
    =============================================*/
    $categoria = ControladorCategorias::ctrMostrarCategorias("id", $producto["id_categoria"]);
    $nombreCategoria = $categoria ? htmlspecialchars($categoria["categoria"]) : "—";

    /*=============================================
    BADGE DE STOCK — colores semánticos BS5
    =============================================*/
    $stock = (int) $producto["stock"];

    if ($stock === 0) {
        $stockHtml = "<span class='badge bg-danger px-2 py-1'>Sin stock</span>";
    } elseif ($stock <= 5) {
        $stockHtml = "<span class='badge bg-danger px-2 py-1'>" . $stock . "</span>";
    } elseif ($stock <= 15) {
        $stockHtml = "<span class='badge bg-warning text-dark px-2 py-1'>" . $stock . "</span>";
    } else {
        $stockHtml = "<span class='badge bg-success px-2 py-1'>" . $stock . "</span>";
    }

    /*=============================================
    PRECIOS
    =============================================*/
    $precioCompra = "$ " . number_format((float) $producto["precio_compra"], 2);
    $precioVenta  = "$ " . number_format((float) $producto["precio_venta"],  2);

    /*=============================================
    BOTONES DE ACCIÓN — BS5 + Bootstrap Icons
    =============================================*/
    $btnEditar = "<button class='btn btn-sm btn-warning btnEditarProducto' "
               . "idProducto='" . (int) $producto["id"] . "' "
               . "data-bs-toggle='modal' data-bs-target='#modalEditarProducto'>"
               . "<i class='bi bi-pencil-fill'></i></button>";

    $btnEliminar = "<button class='btn btn-sm btn-danger btnEliminarProducto' "
                 . "idProducto='" . (int) $producto["id"] . "' "
                 . "codigo='" . htmlspecialchars($producto["codigo"]) . "' "
                 . "imagen='" . htmlspecialchars($producto["imagen"]) . "'>"
                 . "<i class='bi bi-trash-fill'></i></button>";

    if ($perfilOculto === "Especial") {
        $botones = "<div class='btn-group btn-group-sm'>" . $btnEditar . "</div>";
    } else {
        $botones = "<div class='btn-group btn-group-sm'>" . $btnEditar . $btnEliminar . "</div>";
    }

    $data[] = [
        (string) ($i + 1),
        $imagen,
        htmlspecialchars($producto["codigo"]),
        htmlspecialchars($producto["descripcion"]),
        $nombreCategoria,
        $stockHtml,
        $precioCompra,
        $precioVenta,
        htmlspecialchars($producto["fecha"]),
        $botones
    ];
}

echo json_encode(["data" => $data], JSON_UNESCAPED_UNICODE);
