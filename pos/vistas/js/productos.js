/*=============================================
CARGAR TABLA DINÁMICA DE PRODUCTOS
=============================================*/
var perfilOculto = $("#perfilOculto").val();

$('.tablaProductos').DataTable({
	"ajax": "ajax/datatable-productos.ajax.php?perfilOculto=" + perfilOculto,
	"deferRender": true,
	"retrieve": true,
	"processing": true,
	"language": {
		"sProcessing":    "Procesando...",
		"sLengthMenu":    "Mostrar _MENU_ registros",
		"sZeroRecords":   "No se encontraron resultados",
		"sEmptyTable":    "Ningún dato disponible en esta tabla",
		"sInfo":          "Mostrando registros del _START_ al _END_ de un total de _TOTAL_",
		"sInfoEmpty":     "Mostrando registros del 0 al 0 de un total de 0",
		"sInfoFiltered":  "(filtrado de un total de _MAX_ registros)",
		"sInfoPostFix":   "",
		"sSearch":        "Buscar:",
		"sUrl":           "",
		"sInfoThousands": ",",
		"sLoadingRecords":"Cargando...",
		"oPaginate": {
			"sFirst":    "Primero",
			"sLast":     "Último",
			"sNext":     "Siguiente",
			"sPrevious": "Anterior"
		},
		"oAria": {
			"sSortAscending":  ": Activar para ordenar la columna de manera ascendente",
			"sSortDescending": ": Activar para ordenar la columna de manera descendente"
		}
	}
});

/*=============================================
CAPTURANDO CATEGORÍA PARA GENERAR CÓDIGO
=============================================*/
$("#nuevaCategoria").change(function(){

	var idCategoria = $(this).val();

	var datos = new FormData();
	datos.append("idCategoria", idCategoria);

	$.ajax({
		url: "ajax/productos.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){
			if(!respuesta){
				$("#nuevoCodigo").val(idCategoria + "01");
			}else{
				$("#nuevoCodigo").val(Number(respuesta["codigo"]) + 1);
			}
		}
	});

});

/*=============================================
CALCULAR PRECIO DE VENTA POR PORCENTAJE
=============================================*/
$("#nuevoPrecioCompra, #editarPrecioCompra").on("change", function(){

	if($(".porcentaje").prop("checked")){

		var pct = Number($(".nuevoPorcentaje").val());

		var nuevoVenta  = Number($("#nuevoPrecioCompra").val()  * (1 + pct / 100)).toFixed(2);
		var editarVenta = Number($("#editarPrecioCompra").val() * (1 + pct / 100)).toFixed(2);

		$("#nuevoPrecioVenta").val(nuevoVenta).prop("readonly", true);
		$("#editarPrecioVenta").val(editarVenta).prop("readonly", true);
	}

});

$(".nuevoPorcentaje").on("change", function(){

	if($(".porcentaje").prop("checked")){

		var pct = Number($(this).val());

		var nuevoVenta  = Number($("#nuevoPrecioCompra").val()  * (1 + pct / 100)).toFixed(2);
		var editarVenta = Number($("#editarPrecioCompra").val() * (1 + pct / 100)).toFixed(2);

		$("#nuevoPrecioVenta").val(nuevoVenta).prop("readonly", true);
		$("#editarPrecioVenta").val(editarVenta).prop("readonly", true);
	}

});

// BS5 nativo — reemplaza iCheck ifChecked / ifUnchecked
$(".porcentaje").on("change", function(){

	var activo = $(this).prop("checked");

	$("#nuevoPrecioVenta").prop("readonly", activo);
	$("#editarPrecioVenta").prop("readonly", activo);

});

/*=============================================
PREVIEW DE IMAGEN AL SUBIR
=============================================*/
$(".nuevaImagen").on("change", function(){

	var imagen = this.files[0];

	if(imagen["type"] != "image/jpeg" && imagen["type"] != "image/png"){

		$(".nuevaImagen").val("");

		window.swal({
			title: "Formato inválido",
			text: "La imagen debe estar en formato JPG o PNG.",
			icon: "error",
			confirmButtonText: "Cerrar"
		});

	}else if(imagen["size"] > 2000000){

		$(".nuevaImagen").val("");

		window.swal({
			title: "Imagen demasiado grande",
			text: "La imagen no debe pesar más de 2MB.",
			icon: "error",
			confirmButtonText: "Cerrar"
		});

	}else{

		var reader = new FileReader();
		reader.readAsDataURL(imagen);

		$(reader).on("load", function(event){

			var rutaImagen = event.target.result;

			if($("#modalEditarProducto").hasClass("show")){
				$(".previsualizarEditar").attr("src", rutaImagen);
			}else{
				$(".previsualizar").attr("src", rutaImagen);
			}

		});
	}

});

/*=============================================
EDITAR PRODUCTO — event delegation BS5
=============================================*/
$(".tablaProductos").on("click", ".btnEditarProducto", function(){

	var idProducto = $(this).attr("idProducto");

	var datos = new FormData();
	datos.append("idProducto", idProducto);

	$.ajax({
		url: "ajax/productos.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){

			var datosCategoria = new FormData();
			datosCategoria.append("idCategoria", respuesta["id_categoria"]);

			$.ajax({
				url: "ajax/categorias.ajax.php",
				method: "POST",
				data: datosCategoria,
				cache: false,
				contentType: false,
				processData: false,
				dataType: "json",
				success: function(cat){
					$("#editarCategoria").val(cat["id"]);
				}
			});

			$("#editarCodigo").val(respuesta["codigo"]);
			$("#editarDescripcion").val(respuesta["descripcion"]);
			$("#editarStock").val(respuesta["stock"]);
			$("#editarPrecioCompra").val(respuesta["precio_compra"]);
			$("#editarPrecioVenta").val(respuesta["precio_venta"]);

			if(respuesta["imagen"] != ""){
				$("#imagenActual").val(respuesta["imagen"]);
				$(".previsualizarEditar").attr("src", respuesta["imagen"]);
			}
		}
	});

});

/*=============================================
ELIMINAR PRODUCTO — event delegation BS5
=============================================*/
$(".tablaProductos").on("click", ".btnEliminarProducto", function(){

	var idProducto = $(this).attr("idProducto");
	var codigo     = $(this).attr("codigo");
	var imagen     = $(this).attr("imagen");

	window.swal({
		title: "¿Borrar producto?",
		text: "Esta acción no se puede deshacer.",
		icon: "warning",
		showCancelButton: true,
		confirmButtonColor: "#d33",
		cancelButtonColor: "#6c757d",
		cancelButtonText: "Cancelar",
		confirmButtonText: "Sí, borrar"
	}).then(function(result){
		if(result.value){
			window.location = "index.php?ruta=productos&idProducto=" + encodeURIComponent(idProducto)
				+ "&imagen=" + encodeURIComponent(imagen)
				+ "&codigo=" + encodeURIComponent(codigo);
		}
	});

});
