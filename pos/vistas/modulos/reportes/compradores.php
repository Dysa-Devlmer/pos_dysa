<?php

$item  = null;
$valor = null;

$ventas   = ControladorVentas::ctrMostrarVentas($item, $valor);
$clientes = ControladorClientes::ctrMostrarClientes($item, $valor);

$arrayClientes     = [];
$sumaTotalClientes = [];

foreach ($ventas as $venta) {
  foreach ($clientes as $cliente) {
    if($cliente["id"] == $venta["id_cliente"]){
      $nombre = $cliente["nombre"];
      array_push($arrayClientes, $nombre);
      $sumaTotalClientes[$nombre] = ($sumaTotalClientes[$nombre] ?? 0) + $venta["neto"];
    }
  }
}

$noRepetirNombres = array_unique($arrayClientes);

// Preparar datos para ApexCharts
$categorias = [];
$datos      = [];
foreach($noRepetirNombres as $nombre){
  $categorias[] = $nombre;
  $datos[]      = round($sumaTotalClientes[$nombre], 2);
}

?>

<div class="card shadow-sm">
  <div class="card-header bg-primary text-white d-flex align-items-center">
    <i class="bi bi-people me-2"></i><strong>Compradores</strong>
  </div>
  <div class="card-body">
    <div id="chart-compradores" style="min-height:280px;"></div>
  </div>
</div>

<script>
(function(){
  var categoriasCom = <?= json_encode(array_values($categorias)) ?>;
  var datosCom      = <?= json_encode(array_values($datos)) ?>;

  var options = {
    chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
    series: [{ name: 'Compras ($)', data: datosCom }],
    xaxis: { categories: categoriasCom },
    yaxis: { labels: { formatter: function(v){ return '$ ' + v.toLocaleString('es-MX'); } } },
    colors: ['#0d6efd'],
    plotOptions: { bar: { borderRadius: 4, distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: function(v){ return '$ ' + v.toLocaleString('es-MX', {minimumFractionDigits:2}); } } }
  };

  if(categoriasCom.length > 0){
    var chart = new ApexCharts(document.querySelector('#chart-compradores'), options);
    chart.render();
  } else {
    document.querySelector('#chart-compradores').innerHTML =
      '<p class="text-center text-muted py-5">Sin datos de compradores</p>';
  }
})();
</script>
