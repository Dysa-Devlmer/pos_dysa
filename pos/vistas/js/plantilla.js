/*=============================================
PLANTILLA.JS — AdminLTE 4 + Bootstrap 5
Versión moderna sin plugins obsoletos
=============================================*/

$(function () {

  /*=============================================
  SIDEBAR — AdminLTE 4 lo maneja solo con
  data-lte-toggle="treeview", no necesita .tree()
  =============================================*/
  // $('.sidebar-menu').tree()  ← eliminado (AdminLTE 2)


  /*=============================================
  DATATABLES 2.x — Bootstrap 5
  Aplica a todas las tablas con clase .tablas
  =============================================*/
  if ($.fn.DataTable && $(".tablas").length) {
    $(".tablas").DataTable({
      responsive: true,
      language: {
        url: "https://cdn.datatables.net/plug-ins/2.2.2/i18n/es-MX.json"
      },
      pageLength: 10,
      dom: '<"d-flex justify-content-between align-items-center mb-3"Bf>rt<"d-flex justify-content-between align-items-center mt-3"lip>',
      buttons: [
        { extend: 'excel',  text: '<i class="bi bi-file-earmark-excel me-1"></i>Excel', className: 'btn btn-sm btn-success' },
        { extend: 'pdf',    text: '<i class="bi bi-file-earmark-pdf me-1"></i>PDF',     className: 'btn btn-sm btn-danger'  },
        { extend: 'print',  text: '<i class="bi bi-printer me-1"></i>Imprimir',          className: 'btn btn-sm btn-secondary' }
      ]
    });
  }


  /*=============================================
  INPUTMASK 5.x — misma API que la versión antigua
  =============================================*/
  if (typeof Inputmask !== 'undefined') {
    if ($('#datemask').length)  Inputmask('dd/mm/yyyy', { placeholder: 'dd/mm/yyyy' }).mask('#datemask');
    if ($('#datemask2').length) Inputmask('mm/dd/yyyy', { placeholder: 'mm/dd/yyyy' }).mask('#datemask2');
    if ($('[data-mask]').length) Inputmask().mask('[data-mask]');
  }


  /*=============================================
  RESPONSIVE SIDEBAR — AdminLTE 4
  En móvil se muestra, en desktop se colapsa
  =============================================*/
  if (window.matchMedia("(max-width:767px)").matches) {
    document.body.classList.remove('sidebar-collapse');
  } else {
    document.body.classList.add('sidebar-collapse');
  }

});
