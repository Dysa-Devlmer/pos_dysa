/*=============================================
RANGO DE FECHAS — Flatpickr (reemplaza daterangepicker + moment.js)
Stack: Flatpickr 4.x (ya incluido en AdminLTE 4)
=============================================*/

(function () {

  var KEY = "capturarRango2";

  // ── Botón que actúa como disparador ──────────────────────────────────────
  var btn = document.getElementById("daterange-btn2");
  if (!btn) return;

  // Input oculto que Flatpickr maneja internamente
  var input = document.createElement("input");
  input.type   = "text";
  input.id     = "fpRangoInput";
  input.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(input);

  // ── Restaurar rango guardado ──────────────────────────────────────────────
  var rangoGuardado = localStorage.getItem(KEY);
  if (rangoGuardado) {
    var spanRango = btn.querySelector("span.rango-texto");
    if (spanRango) spanRango.textContent = rangoGuardado;
  }

  // ── Inicializar Flatpickr en modo rango ───────────────────────────────────
  var fp = flatpickr(input, {
    mode      : "range",
    dateFormat: "Y-m-d",
    locale    : {
      rangeSeparator: " al ",
      weekdays: {
        shorthand: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
        longhand : ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]
      },
      months: {
        shorthand: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
        longhand : ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
      }
    },
    onClose: function (selectedDates, dateStr) {
      if (selectedDates.length < 2) return;

      var fechaInicial = selectedDates[0].toISOString().slice(0, 10);
      var fechaFinal   = selectedDates[1].toISOString().slice(0, 10);

      // Guardar texto para mostrar en el botón al volver
      var texto = fechaInicial + " → " + fechaFinal;
      localStorage.setItem(KEY, texto);

      // Redirigir con encodeURIComponent
      window.location = "index.php?ruta=reportes"
        + "&fechaInicial=" + encodeURIComponent(fechaInicial)
        + "&fechaFinal="   + encodeURIComponent(fechaFinal);
    }
  });

  // El botón abre el calendario de Flatpickr
  btn.addEventListener("click", function () {
    fp.open();
  });

  // ── Cancelar / limpiar rango ──────────────────────────────────────────────
  var btnLimpiar = document.getElementById("btnLimpiarFecha");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem(KEY);
      window.location = "reportes";
    });
  }

})();
