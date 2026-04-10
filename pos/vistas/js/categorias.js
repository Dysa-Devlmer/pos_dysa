/*=============================================
EDITAR CATEGORIA
=============================================*/
$(".tablas").on("click", ".btnEditarCategoria", function(){

	var idCategoria = $(this).attr("idCategoria");

	var datos = new FormData();
	datos.append("idCategoria", idCategoria);

	$.ajax({
		url: "ajax/categorias.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){
			$("#editarCategoria").val(respuesta["categoria"]);
			$("#idCategoria").val(respuesta["id"]);
		}
	});

});

/*=============================================
ELIMINAR CATEGORIA
=============================================*/
$(".tablas").on("click", ".btnEliminarCategoria", function(){

	var idCategoria = $(this).attr("idCategoria");

	window.swal({
		title: "¿Borrar categoría?",
		text: "Esta acción no se puede deshacer.",
		icon: "warning",
		showCancelButton: true,
		confirmButtonColor: "#d33",
		cancelButtonColor: "#6c757d",
		cancelButtonText: "Cancelar",
		confirmButtonText: "Sí, borrar"
	}).then(function(result){
		if(result.value){
			window.location = "index.php?ruta=categorias&idCategoria=" + encodeURIComponent(idCategoria);
		}
	});

});
