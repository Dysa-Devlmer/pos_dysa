<?php

error_reporting(0);

if(isset($_GET["fechaInicial"])){

    $fechaInicial = $_GET["fechaInicial"];
    $fechaFinal = $_GET["fechaFinal"];

}else{

$fechaInicial = null;
$fechaFinal = null;

}

$respuesta = ControladorVentas::ctrRangoFechasVentas($fechaInicial, $fechaFinal);

$arrayFechas = array();
$arrayVentas = array();
$sumaPagosMes = array();

foreach ($respuesta as $key => $value) {

	#Capturamos sólo el año y el mes
	$fecha = substr($value["fecha"],0,7);

	#Introducir las fechas en arrayFechas
	array_push($arrayFechas, $fecha);

	#Capturamos las ventas
	$arrayVentas = array($fecha => $value["total"]);

	#Sumamos los pagos que ocurrieron el mismo mes
	foreach ($arrayVentas as $key => $value) {
		
		$sumaPagosMes[$key] += $value;
	}

}


$noRepetirFechas = array_unique($arrayFechas);


?>

<!-- GRÁFICO DE VENTAS — ApexCharts -->
<div class="card border-0 shadow-sm h-100" style="border-radius:14px;">
  <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between pt-3 pb-0 px-4">
    <div>
      <h6 class="fw-bold mb-0"><i class="bi bi-graph-up-arrow text-primary me-2"></i>Gráfico de Ventas</h6>
      <small class="text-muted">Ventas por mes</small>
    </div>
  </div>
  <div class="card-body px-3 pb-2">
    <div id="apexChartVentas" style="min-height:260px;"></div>
  </div>
</div>

<script>
(function(){
  var categorias = <?php
    $cats = [];
    if($noRepetirFechas != null){
      foreach($noRepetirFechas as $k){ $cats[] = $k; }
    }
    echo json_encode(array_values($cats));
  ?>;

  var datos = <?php
    $vals = [];
    if($noRepetirFechas != null){
      foreach($noRepetirFechas as $k){ $vals[] = round($sumaPagosMes[$k], 2); }
    }
    echo json_encode(array_values($vals));
  ?>;

  var options = {
    series: [{ name: 'Ventas ($)', data: datos }],
    chart: {
      type: 'area',
      height: 260,
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 }
    },
    colors: ['#339af0'],
    xaxis: { categories: categorias, labels: { style: { fontSize: '11px' } } },
    yaxis: {
      labels: {
        formatter: function(v){ return '$' + v.toLocaleString('es-CO'); }
      }
    },
    tooltip: {
      y: { formatter: function(v){ return '$' + v.toLocaleString('es-CO'); } }
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f3f4', strokeDashArray: 4 },
    markers: { size: 4, colors: ['#fff'], strokeColors: '#339af0', strokeWidth: 2 }
  };

  var chart = new ApexCharts(document.querySelector('#apexChartVentas'), options);
  chart.render();
})();
</script>