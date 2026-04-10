<?php

require_once "../controladores/productos.controlador.php";
require_once "../modelos/productos.modelo.php";

require_once "../controladores/categorias.controlador.php";
require_once "../modelos/categorias.modelo.php";


class TablaProductos{

	/*=============================================
	MOSTRAR LA TABLA DE PRODUCTOS
	=============================================*/

	public function mostrarTablaProductos(){

		$item  = null;
		$valor = null;
		$orden = "id";

		$productos = ControladorProductos::ctrMostrarProductos($item, $valor, $orden);

		if(count($productos) == 0){
			echo '{"data": []}';
			return;
		}

		$datosJson = '{"data": [';

		for($i = 0; $i < count($productos); $i++){

			/*=============================================
			IMAGEN
			=============================================*/
			$imagen = "<img src='".$productos[$i]["imagen"]."' width='40px' class='rounded'>";

			/*=============================================
			CATEGORÍA
			=============================================*/
			$item  = "id";
			$valor = $productos[$i]["id_categoria"];
			$categorias = ControladorCategorias::ctrMostrarCategorias($item, $valor);

			/*=============================================
			STOCK — badge de color según nivel
			=============================================*/
			if($productos[$i]["stock"] <= 10){
				$stock = "<span class='badge bg-danger fs-6'>".$productos[$i]["stock"]."</span>";
			}else if($productos[$i]["stock"] > 10 && $productos[$i]["stock"] <= 15){
				$stock = "<span class='badge bg-warning text-dark fs-6'>".$productos[$i]["stock"]."</span>";
			}else{
				$stock = "<span class='badge bg-success fs-6'>".$productos[$i]["stock"]."</span>";
			}

			/*=============================================
			ACCIONES — BS5 (data-bs-toggle / bi icons)
			=============================================*/
			if(isset($_GET["perfilOculto"]) && $_GET["perfilOculto"] == "Especial"){

				$botones = "<div class='btn-group'>"
					."<button class='btn btn-sm btn-warning btnEditarProducto' idProducto='".$productos[$i]["id"]."' data-bs-toggle='modal' data-bs-target='#modalEditarProducto'>"
					."<i class='bi bi-pencil-fill'></i></button></div>";

			}else{

				$botones = "<div class='btn-group'>"
					."<button class='btn btn-sm btn-warning btnEditarProducto' idProducto='".$productos[$i]["id"]."' data-bs-toggle='modal' data-bs-target='#modalEditarProducto'>"
					."<i class='bi bi-pencil-fill'></i></button>"
					."<button class='btn btn-sm btn-danger btnEliminarProducto' idProducto='".$productos[$i]["id"]."' codigo='".$productos[$i]["codigo"]."' imagen='".$productos[$i]["imagen"]."'>"
					."<i class='bi bi-trash-fill'></i></button></div>";

			}

			$datosJson .= '["'.($i+1).'","'.$imagen.'","'.$productos[$i]["codigo"].'","'.$productos[$i]["descripcion"].'","'.$categorias["categoria"].'","'.$stock.'","'.$productos[$i]["precio_compra"].'","'.$productos[$i]["precio_venta"].'","'.$productos[$i]["fecha"].'","'.$botones.'"],';
		}

		$datosJson  = substr($datosJson, 0, -1);
		$datosJson .= ']}';

		echo $datosJson;
	}
}

$activarProductos = new TablaProductos();
$activarProductos->mostrarTablaProductos();
