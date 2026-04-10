/*=============================================
CARGAR TABLA DINÁMICA DE VENTAS
=============================================*/
$('.tablaVentas').DataTable({
	"ajax": "ajax/datatable-ventas.ajax.php",
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
AGREGAR PRODUCTOS A LA VENTA DESDE TABLA
=============================================*/
$(".tablaVentas").on("click", "button.agregarProducto", function(){

	var idProducto = $(this).attr("idProducto");

	$(this).removeClass("btn-primary agregarProducto");
	$(this).addClass("btn-secondary");

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

			var descripcion = respuesta["descripcion"];
			var stock       = respuesta["stock"];
			var precio      = respuesta["precio_venta"];

			if(stock == 0){

				window.swal({
					title: "Sin stock",
					text: "Este producto no tiene unidades disponibles.",
					icon: "error",
					confirmButtonText: "Cerrar"
				});

				$("button[idProducto='" + idProducto + "']").addClass("btn-primary agregarProducto");
				return;
			}

			$(".nuevoProducto").append(
				'<div class="row g-2 py-2 border-bottom align-items-center">'

				+ '<div class="col-md-6">'
				+   '<div class="input-group">'
				+     '<span class="input-group-text">'
				+       '<button type="button" class="btn btn-danger btn-sm quitarProducto" idProducto="' + idProducto + '">'
				+         '<i class="bi bi-x-lg"></i>'
				+       '</button>'
				+     '</span>'
				+     '<input type="text" class="form-control nuevaDescripcionProducto" idProducto="' + idProducto + '" name="agregarProducto" value="' + descripcion + '" readonly required>'
				+   '</div>'
				+ '</div>'

				+ '<div class="col-md-3">'
				+   '<input type="number" class="form-control nuevaCantidadProducto" name="nuevaCantidadProducto" min="1" value="1" stock="' + stock + '" nuevoStock="' + Number(stock - 1) + '" required>'
				+ '</div>'

				+ '<div class="col-md-3">'
				+   '<div class="input-group">'
				+     '<span class="input-group-text"><i class="bi bi-currency-dollar"></i></span>'
				+     '<input type="text" class="form-control nuevoPrecioProducto" precioReal="' + precio + '" name="nuevoPrecioProducto" value="' + precio + '" readonly required>'
				+   '</div>'
				+ '</div>'

				+ '</div>'
			);

			sumarTotalPrecios();
			agregarImpuesto();
			listarProductos();
			$(".nuevoPrecioProducto").number(true, 2);
			localStorage.removeItem("quitarProducto");
		}
	});

});

/*=============================================
REDIBUJAR TABLA — restaurar botones ya agregados
=============================================*/
$(".tablaVentas").on("draw.dt", function(){

	if(localStorage.getItem("quitarProducto") != null){

		var listaIdProductos = JSON.parse(localStorage.getItem("quitarProducto"));

		for(var i = 0; i < listaIdProductos.length; i++){
			$("button.recuperarBoton[idProducto='" + listaIdProductos[i]["idProducto"] + "']")
				.removeClass("btn-secondary")
				.addClass("btn-primary agregarProducto");
		}
	}

});

/*=============================================
QUITAR PRODUCTOS DE LA VENTA
=============================================*/
var idQuitarProducto = [];
localStorage.removeItem("quitarProducto");

$(".formularioVenta").on("click", "button.quitarProducto", function(){

	$(this).closest(".row").remove();

	var idProducto = $(this).attr("idProducto");

	if(localStorage.getItem("quitarProducto") == null){
		idQuitarProducto = [];
	}else{
		idQuitarProducto.concat(localStorage.getItem("quitarProducto"));
	}

	idQuitarProducto.push({"idProducto": idProducto});
	localStorage.setItem("quitarProducto", JSON.stringify(idQuitarProducto));

	$("button.recuperarBoton[idProducto='" + idProducto + "']")
		.removeClass("btn-secondary")
		.addClass("btn-primary agregarProducto");

	if($(".nuevoProducto").children().length == 0){
		$("#nuevoImpuestoVenta").val(0);
		$("#nuevoTotalVenta").val(0);
		$("#totalVenta").val(0);
		$("#nuevoTotalVenta").attr("total", 0);
	}else{
		sumarTotalPrecios();
		agregarImpuesto();
		listarProductos();
	}

});

/*=============================================
AGREGAR PRODUCTOS DESDE BOTÓN MÓVIL
=============================================*/
var numProducto = 0;

$(".btnAgregarProducto").click(function(){

	numProducto++;

	var datos = new FormData();
	datos.append("traerProductos", "ok");

	$.ajax({
		url: "ajax/productos.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){

			$(".nuevoProducto").append(
				'<div class="row g-2 py-2 border-bottom align-items-center">'

				+ '<div class="col-md-6">'
				+   '<div class="input-group">'
				+     '<span class="input-group-text">'
				+       '<button type="button" class="btn btn-danger btn-sm quitarProducto" idProducto>'
				+         '<i class="bi bi-x-lg"></i>'
				+       '</button>'
				+     '</span>'
				+     '<select class="form-select nuevaDescripcionProducto" id="producto' + numProducto + '" idProducto name="nuevaDescripcionProducto" required>'
				+       '<option>Seleccione el producto</option>'
				+     '</select>'
				+   '</div>'
				+ '</div>'

				+ '<div class="col-md-3">'
				+   '<input type="number" class="form-control nuevaCantidadProducto" name="nuevaCantidadProducto" min="1" value="0" stock nuevoStock required>'
				+ '</div>'

				+ '<div class="col-md-3">'
				+   '<div class="input-group">'
				+     '<span class="input-group-text"><i class="bi bi-currency-dollar"></i></span>'
				+     '<input type="text" class="form-control nuevoPrecioProducto" precioReal="" name="nuevoPrecioProducto" readonly required>'
				+   '</div>'
				+ '</div>'

				+ '</div>'
			);

			respuesta.forEach(function(item){
				if(item.stock != 0){
					$("#producto" + numProducto).append(
						'<option idProducto="' + item.id + '" value="' + item.descripcion + '">' + item.descripcion + '</option>'
					);
				}
			});

			sumarTotalPrecios();
			agregarImpuesto();
			$(".nuevoPrecioProducto").number(true, 2);
		}
	});

});

/*=============================================
SELECCIONAR PRODUCTO EN SELECT
=============================================*/
$(".formularioVenta").on("change", "select.nuevaDescripcionProducto", function(){

	var nombreProducto           = $(this).val();
	var nuevaDescripcionProducto = $(this).closest(".row").find(".nuevaDescripcionProducto");
	var nuevoPrecioProducto      = $(this).closest(".row").find(".nuevoPrecioProducto");
	var nuevaCantidadProducto    = $(this).closest(".row").find(".nuevaCantidadProducto");

	var datos = new FormData();
	datos.append("nombreProducto", nombreProducto);

	$.ajax({
		url: "ajax/productos.ajax.php",
		method: "POST",
		data: datos,
		cache: false,
		contentType: false,
		processData: false,
		dataType: "json",
		success: function(respuesta){
			$(nuevaDescripcionProducto).attr("idProducto", respuesta["id"]);
			$(nuevaCantidadProducto).attr("stock", respuesta["stock"]);
			$(nuevaCantidadProducto).attr("nuevoStock", Number(respuesta["stock"]) - 1);
			$(nuevoPrecioProducto).val(respuesta["precio_venta"]);
			$(nuevoPrecioProducto).attr("precioReal", respuesta["precio_venta"]);
			listarProductos();
		}
	});

});

/*=============================================
MODIFICAR CANTIDAD
=============================================*/
$(".formularioVenta").on("change", "input.nuevaCantidadProducto", function(){

	var precio      = $(this).closest(".row").find(".nuevoPrecioProducto");
	var precioFinal = $(this).val() * precio.attr("precioReal");
	precio.val(precioFinal);

	var nuevoStock = Number($(this).attr("stock")) - $(this).val();
	$(this).attr("nuevoStock", nuevoStock);

	if(Number($(this).val()) > Number($(this).attr("stock"))){

		$(this).val(0);
		$(this).attr("nuevoStock", $(this).attr("stock"));
		precio.val(0);
		sumarTotalPrecios();

		window.swal({
			title: "Cantidad supera el stock",
			text: "Solo hay " + $(this).attr("stock") + " unidades disponibles.",
			icon: "error",
			confirmButtonText: "Cerrar"
		});

		return;
	}

	sumarTotalPrecios();
	agregarImpuesto();
	listarProductos();

});

/*=============================================
SUMAR TOTAL DE PRECIOS
=============================================*/
function sumarTotalPrecios(){

	var precioItem     = $(".nuevoPrecioProducto");
	var arraySumaPrecio = [];

	for(var i = 0; i < precioItem.length; i++){
		arraySumaPrecio.push(Number($(precioItem[i]).val()));
	}

	var sumaTotalPrecio = arraySumaPrecio.reduce(function(total, num){ return total + num; }, 0);

	$("#nuevoTotalVenta").val(sumaTotalPrecio);
	$("#totalVenta").val(sumaTotalPrecio);
	$("#nuevoTotalVenta").attr("total", sumaTotalPrecio);
}

/*=============================================
AGREGAR IMPUESTO
=============================================*/
function agregarImpuesto(){

	var impuesto        = $("#nuevoImpuestoVenta").val();
	var precioTotal     = $("#nuevoTotalVenta").attr("total");
	var precioImpuesto  = Number(precioTotal * impuesto / 100);
	var totalConImpuesto = Number(precioImpuesto) + Number(precioTotal);

	$("#nuevoTotalVenta").val(totalConImpuesto);
	$("#totalVenta").val(totalConImpuesto);
	$("#nuevoPrecioImpuesto").val(precioImpuesto);
	$("#nuevoPrecioNeto").val(precioTotal);
}

$("#nuevoImpuestoVenta").change(function(){
	agregarImpuesto();
});

$("#nuevoTotalVenta").number(true, 2);

/*=============================================
SELECCIONAR MÉTODO DE PAGO
=============================================*/
$("#nuevoMetodoPago").change(function(){

	var metodo = $(this).val();

	if(metodo == "Efectivo"){

		$(this).closest(".col-md-6, .col-md-4").removeClass("col-md-6").addClass("col-md-4");

		$(this).closest(".col-md-4").siblings(".cajasMetodoPago").html(
			'<div class="col-md-4">'
			+ '<div class="input-group">'
			+   '<span class="input-group-text"><i class="bi bi-currency-dollar"></i></span>'
			+   '<input type="text" class="form-control" id="nuevoValorEfectivo" placeholder="000000" required>'
			+ '</div>'
			+ '</div>'
			+ '<div class="col-md-4" id="capturarCambioEfectivo">'
			+ '<div class="input-group">'
			+   '<span class="input-group-text"><i class="bi bi-currency-dollar"></i></span>'
			+   '<input type="text" class="form-control" id="nuevoCambioEfectivo" placeholder="Cambio" readonly>'
			+ '</div>'
			+ '</div>'
		);

		$('#nuevoValorEfectivo').number(true, 2);
		$('#nuevoCambioEfectivo').number(true, 2);
		listarMetodos();

	}else{

		$(this).closest(".col-md-4, .col-md-6").removeClass("col-md-4").addClass("col-md-6");

		$(this).closest(".col-md-6").siblings(".cajasMetodoPago").html(
			'<div class="col-md-6">'
			+ '<div class="input-group">'
			+   '<input type="number" min="0" class="form-control" id="nuevoCodigoTransaccion" placeholder="Código transacción" required>'
			+   '<span class="input-group-text"><i class="bi bi-lock-fill"></i></span>'
			+ '</div>'
			+ '</div>'
		);
	}

});

$(".formularioVenta").on("change", "input#nuevoValorEfectivo", function(){
	var efectivo = $(this).val();
	var cambio   = Number(efectivo) - Number($("#nuevoTotalVenta").val());
	$("#nuevoCambioEfectivo").val(cambio);
});

$(".formularioVenta").on("change", "input#nuevoCodigoTransaccion", function(){
	listarMetodos();
});

/*=============================================
LISTAR PRODUCTOS EN JSON
=============================================*/
function listarProductos(){

	var listaProductos = [];
	var descripcion    = $(".nuevaDescripcionProducto");
	var cantidad       = $(".nuevaCantidadProducto");
	var precio         = $(".nuevoPrecioProducto");

	for(var i = 0; i < descripcion.length; i++){
		listaProductos.push({
			"id":          $(descripcion[i]).attr("idProducto"),
			"descripcion": $(descripcion[i]).val(),
			"cantidad":    $(cantidad[i]).val(),
			"stock":       $(cantidad[i]).attr("nuevoStock"),
			"precio":      $(precio[i]).attr("precioReal"),
			"total":       $(precio[i]).val()
		});
	}

	$("#listaProductos").val(JSON.stringify(listaProductos));
}

/*=============================================
LISTAR MÉTODO DE PAGO
=============================================*/
function listarMetodos(){

	if($("#nuevoMetodoPago").val() == "Efectivo"){
		$("#listaMetodoPago").val("Efectivo");
	}else{
		$("#listaMetodoPago").val($("#nuevoMetodoPago").val() + "-" + $("#nuevoCodigoTransaccion").val());
	}
}

/*=============================================
EDITAR VENTA
=============================================*/
$(".tablas").on("click", ".btnEditarVenta", function(){

	var idVenta = $(this).attr("idVenta");
	window.location = "index.php?ruta=editar-venta&idVenta=" + encodeURIComponent(idVenta);

});

/*=============================================
DESACTIVAR BOTONES DE PRODUCTOS YA AGREGADOS
=============================================*/
function quitarAgregarProducto(){

	var idProductos  = $(".quitarProducto");
	var botonesTabla = $(".tablaVentas button.agregarProducto");

	for(var i = 0; i < idProductos.length; i++){
		var boton = $(idProductos[i]).attr("idProducto");
		for(var j = 0; j < botonesTabla.length; j++){
			if($(botonesTabla[j]).attr("idProducto") == boton){
				$(botonesTabla[j]).removeClass("btn-primary agregarProducto").addClass("btn-secondary");
			}
		}
	}
}

$('.tablaVentas').on('draw.dt', function(){
	quitarAgregarProducto();
});

/*=============================================
BORRAR VENTA — SweetAlert2 v11
=============================================*/
$(".tablas").on("click", ".btnEliminarVenta", function(){

	var idVenta = $(this).attr("idVenta");

	window.swal({
		title: "¿Borrar venta?",
		text: "Esta acción no se puede deshacer.",
		icon: "warning",
		showCancelButton: true,
		confirmButtonColor: "#d33",
		cancelButtonColor: "#6c757d",
		cancelButtonText: "Cancelar",
		confirmButtonText: "Sí, borrar"
	}).then(function(result){
		if(result.value){
			window.location = "index.php?ruta=ventas&idVenta=" + encodeURIComponent(idVenta);
		}
	});

});

/*=============================================
IMPRIMIR FACTURA
=============================================*/
$(".tablas").on("click", ".btnImprimirFactura", function(){
	var codigoVenta = $(this).attr("codigoVenta");
	window.open("extensiones/tcpdf/pdf/factura.php?codigo=" + codigoVenta, "_blank");
});

/*=============================================
RANGO DE FECHAS (daterangepicker + moment.js)
=============================================*/
$('#daterange-btn').daterangepicker(
	{
		ranges: {
			'Hoy':            [moment(), moment()],
			'Ayer':           [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
			'Últimos 7 días': [moment().subtract(6, 'days'), moment()],
			'Últimos 30 días':[moment().subtract(29, 'days'), moment()],
			'Este mes':       [moment().startOf('month'), moment().endOf('month')],
			'Último mes':     [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
		},
		startDate: moment(),
		endDate:   moment()
	},
	function(start, end){
		$('#daterange-btn span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));

		var fechaInicial = start.format('YYYY-MM-DD');
		var fechaFinal   = end.format('YYYY-MM-DD');

		localStorage.setItem("capturarRango", $("#daterange-btn span").html());
		window.location = "index.php?ruta=ventas&fechaInicial=" + fechaInicial + "&fechaFinal=" + fechaFinal;
	}
);

$(".daterangepicker.opensleft .range_inputs .cancelBtn").on("click", function(){
	localStorage.removeItem("capturarRango");
	localStorage.clear();
	window.location = "ventas";
});

$(".daterangepicker.opensleft .ranges li").on("click", function(){

	var textoHoy = $(this).attr("data-range-key");

	if(textoHoy == "Hoy"){
		var d   = new Date();
		var dia = ("0" + d.getDate()).slice(-2);
		var mes = ("0" + (d.getMonth() + 1)).slice(-2);
		var año = d.getFullYear();
		var fechaInicial = año + "-" + mes + "-" + dia;
		var fechaFinal   = año + "-" + mes + "-" + dia;
		localStorage.setItem("capturarRango", "Hoy");
		window.location = "index.php?ruta=ventas&fechaInicial=" + fechaInicial + "&fechaFinal=" + fechaFinal;
	}

});

/*=============================================
ABRIR XML EN NUEVA PESTAÑA
=============================================*/
$(".abrirXML").click(function(){
	window.open($(this).attr("archivo"), "_blank");
});
