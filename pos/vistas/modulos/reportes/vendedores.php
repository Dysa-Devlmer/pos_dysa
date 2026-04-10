<?php

$item  = null;
$valor = null;

$ventas   = ControladorVentas::ctrMostrarVentas($item, $valor);
$usuarios = ControladorUsuarios::ctrMostrarUsuarios($item, $valor);

$arrayVendedores      = [];
$sumaTotalVendedores  = [];

foreach ($ventas as $venta) {
  foreach ($usuarios as $usuario) {
    if($usuario["id"] == $venta["id_vendedor"]){
      $nombre = $usuario["nombre"];
      array_push($arrayVendedores, $nombre);
      $sumaTotalVendedores[$nombre] = ($sumaTotalVendedores[$nombre] ?? 0) + $venta["neto"];
    }
  }
}

$noRepetirNombres = array_unique($arrayVendedores);

// Preparar datos para ApexCharts
$categorias = [];
$datos      = [];
foreach($noRepetirNombres as $nombre){
  $categorias[] = $nombre;
  $datos[]      = round($sumaTotalVendedores[$nombre], 2);
}

?>

<div class="card shadow-sm">
  <div class="card-header bg-success text-white d-flex align-items-center">
    <i class="bi bi-person-badge me-2"></i><strong>Vendedores</strong>
  </div>
  <div class="card-body">
    <div id="chart-vendedores" style="min-height:280px;"></div>
  </div>
</div>

<script>
(function(){
  var categoriasVend = <?= json_encode(array_values($categorias)) ?>;
  var datosVend      = <?= json_encode(array_values($datos)) ?>;

  var options = {
    chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
    series: [{ name: 'Ventas ($)', data: datosVend }],
    xaxis: { categories: categoriasVend },
    yaxis: { labels: { formatter: function(v){ return '$ ' + v.toLocaleString('es-MX'); } } },
    colors: ['#198754'],
    plotOptions: { bar: { borderRadius: 4, distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: function(v){ return '$ ' + v.toLocaleString('es-MX', {minimumFractionDigits:2}); } } }
  };

  if(categoriasVend.length > 0){
    var chart = new ApexCharts(document.querySelector('#chart-vendedores'), options);
    chart.render();
  } else {
    document.querySelector('#chart-vendedores').innerHTML =
      '<p class="text-center text-muted py-5">Sin datos de vendedores</p>';
  }
})();
</script>
