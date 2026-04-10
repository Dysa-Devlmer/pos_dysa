/*=============================================
USUARIOS.JS — Bootstrap 5 / AdminLTE 4
Gestión completa de usuarios del sistema
=============================================*/

/*=============================================
SUBIR FOTO — previsualizar según modal activo
=============================================*/
$(".nuevaFoto").change(function(){

	var imagen = this.files[0];

	if(imagen["type"] != "image/jpeg" && imagen["type"] != "image/png"){

		$(".nuevaFoto").val("");

		swal({
			title: "Error al subir la imagen",
			text: "¡La imagen debe estar en formato JPG o PNG!",
			type: "error",
			confirmButtonText: "¡Cerrar!"
		});

	}else if(imagen["size"] > 2000000){

		$(".nuevaFoto").val("");

		swal({
			title: "Error al subir la imagen",
			text: "¡La imagen no debe pesar más de 2MB!",
			type: "error",
			confirmButtonText: "¡Cerrar!"
		});

	}else{

		var datosImagen = new FileReader;
		datosImagen.readAsDataURL(imagen);

		$(datosImagen).on("load", function(event){

			var rutaImagen = event.target.result;

			// Actualizar la vista previa según el modal activo
			if($("#modalEditarUsuario").hasClass("show")){
				$(".previsualizarEditar").attr("src", rutaImagen);
			}else{
				$(".previsualizar").attr("src", rutaImagen);
			}

		});

	}

});

/*=============================================
EDITAR USUARIO — cargar datos en modal
DataTables requiere delegación en .tablas
=============================================*/
$(".tablas").on("click", ".btnEditarUsuario", function(){

	var idUsuario = $(this).attr("idUsuario");

	var datos = new FormData();
	datos.append("idUsuario", idUsuario);

	$.ajax({

		url: "ajax/usuarios.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){

			$("#editarNombre").val(respuesta["nombre"]);
			$("#editarUsuario").val(respuesta["usuario"]);
			$("#editarPerfil").html(respuesta["perfil"]);
			$("#editarPerfil").val(respuesta["perfil"]);
			$("#fotoActual").val(respuesta["foto"]);
			$("#passwordActual").val(respuesta["password"]);

			if(respuesta["foto"] != ""){
				$(".previsualizarEditar").attr("src", respuesta["foto"]);
			}else{
				$(".previsualizarEditar").attr("src", "vistas/img/usuarios/default/anonymous.png");
			}

		}

	});

});

/*=============================================
ACTIVAR / DESACTIVAR USUARIO
=============================================*/
$(".tablas").on("click", ".btnActivar", function(){

	var idUsuario    = $(this).attr("idUsuario");
	var estadoUsuario = $(this).attr("estadoUsuario");

	var datos = new FormData();
	datos.append("activarId",      idUsuario);
	datos.append("activarUsuario", estadoUsuario);

	$.ajax({

		url: "ajax/usuarios.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		success: function(respuesta){

			if(window.matchMedia("(max-width:767px)").matches){

				swal({
					title: "El usuario ha sido actualizado",
					type: "success",
					confirmButtonText: "¡Cerrar!"
				}).then(function(result){
					if(result.value){
						window.location = "usuarios";
					}
				});

			}

		}

	});

	// Actualizar botón en la tabla (sin recargar página)
	if(estadoUsuario == 0){

		$(this).removeClass("btn-success").addClass("btn-danger");
		$(this).html('<i class="bi bi-x-circle me-1"></i>Inactivo');
		$(this).attr("estadoUsuario", 1);

	}else{

		$(this).removeClass("btn-danger").addClass("btn-success");
		$(this).html('<i class="bi bi-check-circle me-1"></i>Activo');
		$(this).attr("estadoUsuario", 0);

	}

});

/*=============================================
VALIDAR SI EL USUARIO YA EXISTE
=============================================*/
$("#nuevoUsuario").on("change", function(){

	$(".alert-username").remove();

	var usuario = $(this).val();

	var datos = new FormData();
	datos.append("validarUsuario", usuario);

	$.ajax({

		url: "ajax/usuarios.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){

			if(respuesta){

				$("#nuevoUsuario").closest(".input-group")
					.after('<div class="alert alert-warning alert-username py-2 mt-1 small">'+
					       '<i class="bi bi-exclamation-triangle me-1"></i>'+
					       'Este usuario ya existe en la base de datos.</div>');

				$("#nuevoUsuario").val("").focus();

			}

		}

	});

});

/*=============================================
ELIMINAR USUARIO
=============================================*/
$(".tablas").on("click", ".btnEliminarUsuario", function(){

	var idUsuario   = $(this).attr("idUsuario");
	var fotoUsuario = $(this).attr("fotoUsuario");
	var usuario     = $(this).attr("usuario");

	swal({
		title: "¿Borrar el usuario?",
		text: "Esta acción no se puede deshacer.",
		type: "warning",
		showCancelButton: true,
		confirmButtonColor: "#dc3545",
		cancelButtonColor:  "#6c757d",
		cancelButtonText:   "Cancelar",
		confirmButtonText:  "Sí, borrar"
	}).then(function(result){

		if(result.value){

			window.location = "index.php?ruta=usuarios&idUsuario=" + idUsuario +
			                  "&usuario=" + encodeURIComponent(usuario) +
			                  "&fotoUsuario=" + encodeURIComponent(fotoUsuario);

		}

	});

});
