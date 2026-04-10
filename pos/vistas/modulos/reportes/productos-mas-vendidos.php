<?php

$item = null;
$valor = null;
$orden = "ventas";

$productos = ControladorProductos::ctrMostrarProductos($item, $valor, $orden);

$colores = array("red","green","yellow","aqua","purple","blue","cyan","magenta","orange","gold");

$totalVentas = ControladorProductos::ctrMostrarSumaVentas();


?>

<!-- PRODUCTOS MÁS VENDIDOS — ApexCharts Donut -->
<div class="card border-0 shadow-sm h-100" style="border-radius:14px;">
  <div class="card-header bg-transparent border-0 pt-3 pb-0 px-4">
    <h6 class="fw-bold mb-0"><i class="bi bi-trophy-fill text-warning me-2"></i>Más Vendidos</h6>
    <small class="text-muted">Top 5 productos</small>
  </div>
  <div class="card-body px-3 pb-0">
    <div id="apexDonutProductos" style="min-height:200px;"></div>
  </div>
  <div class="card-footer bg-transparent border-0 px-4 pb-3">
    <ul class="list-unstyled mb-0 small">
      <?php
        $coloresHex = ['#339af0','#51cf66','#fcc419','#ff6b6b','#cc5de8'];
        for($i = 0; $i < min(5, count($productos)); $i++):
          $pct = $totalVentas["total"] > 0 ? ceil($productos[$i]["ventas"]*100/$totalVentas["total"]) : 0;
      ?>
      <li class="d-flex align-items-center justify-content-between py-1">
        <span class="d-flex align-items-center gap-2">
          <span class="rounded-circle" style="width:8px;height:8px;background:<?= $coloresHex[$i] ?>;display:inline-block;flex-shrink:0;"></span>
          <span class="text-truncate" style="max-width:130px;" title="<?= htmlspecialchars($productos[$i]["descripcion"]) ?>">
            <?= htmlspecialchars($productos[$i]["descripcion"]) ?>
          </span>
        </span>
        <span class="fw-bold" style="color:<?= $coloresHex[$i] ?>"><?= $pct ?>%</span>
      </li>
      <?php endfor; ?>
    </ul>
  </div>
</div>

<script>
(function(){
  var labels = <?php
    $lbs = [];
    for($i=0; $i < min(5, count($productos)); $i++){
      $lbs[] = substr($productos[$i]["descripcion"], 0, 20);
    }
    echo json_encode($lbs);
  ?>;

  var series = <?php
    $vals = [];
    for($i=0; $i < min(5, count($productos)); $i++){
      $vals[] = (int)$productos[$i]["ventas"];
    }
    echo json_encode($vals);
  ?>;

  var options = {
    series: series,
    chart: { type: 'donut', height: 200, animations: { speed: 800 } },
    labels: labels,
    colors: ['#339af0','#51cf66','#fcc419','#ff6b6b','#cc5de8'],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: { donut: { size: '65%', labels: {
        show: true,
        total: { show: true, label: 'Ventas', color: '#6c757d', fontSize: '12px',
          formatter: function(w){ return w.globals.seriesTotals.reduce((a,b)=>a+b,0); }
        }
      }}}
    },
    stroke: { width: 0 },
    tooltip: { y: { formatter: function(v){ return v + ' uds'; } } }
  };

  var chart = new ApexCharts(document.querySelector('#apexDonutProductos'), options);
  chart.render();
})();
</script>