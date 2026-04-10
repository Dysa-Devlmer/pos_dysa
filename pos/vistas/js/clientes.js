/*=============================================
EDITAR CLIENTE — event delegation BS5
=============================================*/
$(".tablas").on("click", ".btnEditarCliente", function(){

	var idCliente = $(this).attr("idCliente");

	var datos = new FormData();
	datos.append("idCliente", idCliente);

	$.ajax({
		url: "ajax/clientes.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){
			$("#idCliente").val(respuesta["id"]);
			$("#editarCliente").val(respuesta["nombre"]);
			$("#editarDocumentoId").val(respuesta["documento"]);
			$("#editarEmail").val(respuesta["email"]);
			$("#editarTelefono").val(respuesta["telefono"]);
			$("#editarDireccion").val(respuesta["direccion"]);
			$("#editarFechaNacimiento").val(respuesta["fecha_nacimiento"]);
		}
	});

});

/*=============================================
ELIMINAR CLIENTE — SweetAlert2 v11
=============================================*/
$(".tablas").on("click", ".btnEliminarCliente", function(){

	var idCliente = $(this).attr("idCliente");

	window.swal({
		title: "¿Borrar cliente?",
		text: "Esta acción no se puede deshacer.",
		icon: "warning",
		showCancelButton: true,
		confirmButtonColor: "#d33",
		cancelButtonColor: "#6c757d",
		cancelButtonText: "Cancelar",
		confirmButtonText: "Sí, borrar"
	}).then(function(result){
		if(result.value){
			window.location = "index.php?ruta=clientes&idCliente=" + encodeURIComponent(idCliente);
		}
	});

});
