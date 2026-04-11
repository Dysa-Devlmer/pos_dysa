<?php

/*=============================================
TICKET TÉRMICO PDF — TCPDF
Formato A7 (74mm) para impresoras térmicas
=============================================*/

require_once "../../../controladores/ventas.controlador.php";
require_once "../../../modelos/ventas.modelo.php";
require_once "../../../controladores/clientes.controlador.php";
require_once "../../../modelos/clientes.modelo.php";
require_once "../../../controladores/usuarios.controlador.php";
require_once "../../../modelos/usuarios.modelo.php";
require_once "tcpdf_include.php";

/*=============================================
VALIDAR PARÁMETRO
=============================================*/
if (!isset($_GET["codigo"]) || trim($_GET["codigo"]) === "") {
    http_response_code(400);
    die("Código de factura no proporcionado.");
}

$codigoFactura = trim($_GET["codigo"]);

/*=============================================
TRAER DATOS DE LA VENTA
=============================================*/
$venta = ControladorVentas::ctrMostrarVentas("codigo", $codigoFactura);

if (!$venta) {
    http_response_code(404);
    die("Factura no encontrada.");
}

$fecha     = substr($venta["fecha"], 0, -8);
$productos = json_decode($venta["productos"], true) ?: [];
$neto      = (float) $venta["neto"];
$impuesto  = (float) $venta["impuesto"];
$total     = (float) $venta["total"];
$metodo    = $venta["metodo_pago"] ?? "—";

$cliente  = ControladorClientes::ctrMostrarClientes("id", $venta["id_cliente"]);
$vendedor = ControladorUsuarios::ctrMostrarUsuarios("id", $venta["id_vendedor"]);

$nombreCliente  = $cliente["nombre"]  ?? "—";
$nombreVendedor = $vendedor["nombre"] ?? "—";

/*=============================================
CONFIGURAR TCPDF — Tamaño ticket 74mm × auto
=============================================*/
// Ancho 74mm (A7 width), alto generado dinámicamente
$ticketAncho = 74;

// Estimar alto según cantidad de productos
$altoEstimado = 120 + (count($productos) * 14);
$pageFormat   = [$ticketAncho, max($altoEstimado, 140)];

$pdf = new TCPDF("P", "mm", $pageFormat, true, "UTF-8", false);
$pdf->SetCreator("POS System");
$pdf->SetTitle("Ticket #" . $codigoFactura);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$pdf->SetMargins(4, 4, 4);
$pdf->SetAutoPageBreak(false);
$pdf->SetFont("courier", "", 8);
$pdf->startPageGroup();
$pdf->AddPage("P", $pageFormat);

$anchoUtil = $ticketAncho - 8; // 66mm útiles

// Colores
$colorNegro  = [0,   0,   0  ];
$colorGris   = [80,  80,  80 ];
$colorClaro  = [200, 200, 200];

/*=============================================
ENCABEZADO DEL TICKET
=============================================*/
$pdf->SetFont("courier", "B", 11);
$pdf->SetTextColor(...$colorNegro);
$pdf->SetXY(4, 4);
$pdf->Cell($anchoUtil, 6, "DEVLMER POS", 0, 1, "C");

$pdf->SetFont("courier", "", 7);
$pdf->SetTextColor(...$colorGris);
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "NIT: 71.759.963-9", 0, 1, "C");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "Calle 44B 92-11 | Tel. 300 786 52 49", 0, 1, "C");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "ventas@devlmerpos.com", 0, 1, "C");

// Línea separadora
$yLinea = $pdf->GetY() + 1;
$pdf->SetDrawColor(...$colorClaro);
$pdf->Line(4, $yLinea, $ticketAncho - 4, $yLinea);

/*=============================================
INFO DE LA VENTA
=============================================*/
$pdf->SetFont("courier", "", 7);
$pdf->SetTextColor(...$colorNegro);
$y0 = $yLinea + 3;

$pdf->SetXY(4, $y0);
$pdf->Cell($anchoUtil, 4, "FACTURA: " . $codigoFactura, 0, 1, "C");
$pdf->SetFont("courier", "", 7);
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "Fecha : " . $fecha, 0, 1, "L");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "Cliente: " . mb_strimwidth($nombreCliente, 0, 28, "..."), 0, 1, "L");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "Vendedor: " . mb_strimwidth($nombreVendedor, 0, 26, "..."), 0, 1, "L");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 4, "Pago: " . $metodo, 0, 1, "L");

// Línea doble
$yL2 = $pdf->GetY() + 1;
$pdf->Line(4, $yL2, $ticketAncho - 4, $yL2);

/*=============================================
ENCABEZADO DE PRODUCTOS
=============================================*/
$y1 = $yL2 + 2;
$pdf->SetFont("courier", "B", 7);
$pdf->SetXY(4, $y1);
$pdf->Cell(34, 5, "PRODUCTO",  0, 0, "L");
$pdf->Cell(8,  5, "CANT",     0, 0, "C");
$pdf->Cell(12, 5, "P/UND",    0, 0, "R");
$pdf->Cell(12, 5, "TOTAL",    0, 1, "R");

// Línea bajo encabezado
$yL3 = $pdf->GetY();
$pdf->Line(4, $yL3, $ticketAncho - 4, $yL3);

/*=============================================
FILAS DE PRODUCTOS
=============================================*/
$pdf->SetFont("courier", "", 7);
$pdf->SetTextColor(...$colorNegro);

foreach ($productos as $item) {
    $desc       = mb_strimwidth($item["descripcion"], 0, 20, "...");
    $cant       = (int) $item["cantidad"];
    $precioUnit = (float) ($item["precio"] ?? 0);
    $precioTot  = (float) ($item["total"]  ?? 0);

    $pdf->SetX(4);
    $pdf->Cell(34, 5, $desc,                                  0, 0, "L");
    $pdf->Cell(8,  5, $cant,                                  0, 0, "C");
    $pdf->Cell(12, 5, number_format($precioUnit, 0, ".", ","), 0, 0, "R");
    $pdf->Cell(12, 5, number_format($precioTot,  0, ".", ","), 0, 1, "R");
}

// Línea
$yL4 = $pdf->GetY() + 1;
$pdf->Line(4, $yL4, $ticketAncho - 4, $yL4);

/*=============================================
TOTALES
=============================================*/
$pdf->SetFont("courier", "", 8);
$yT = $yL4 + 2;

$pdf->SetXY(4, $yT);
$pdf->Cell(42, 5, "Subtotal:", 0, 0, "L");
$pdf->Cell(20, 5, "$ " . number_format($neto, 2), 0, 1, "R");

$pdf->SetX(4);
$pdf->Cell(42, 5, "Impuesto:", 0, 0, "L");
$pdf->Cell(20, 5, "$ " . number_format($impuesto, 2), 0, 1, "R");

// Línea antes del total
$yL5 = $pdf->GetY() + 1;
$pdf->SetDrawColor(...$colorNegro);
$pdf->Line(4, $yL5, $ticketAncho - 4, $yL5);

$pdf->SetFont("courier", "B", 10);
$pdf->SetXY(4, $yL5 + 2);
$pdf->Cell(42, 6, "TOTAL:", 0, 0, "L");
$pdf->Cell(20, 6, "$ " . number_format($total, 2), 0, 1, "R");

// Línea final
$yL6 = $pdf->GetY() + 1;
$pdf->SetDrawColor(...$colorClaro);
$pdf->Line(4, $yL6, $ticketAncho - 4, $yL6);

/*=============================================
PIE DEL TICKET
=============================================*/
$pdf->SetFont("courier", "I", 7);
$pdf->SetTextColor(...$colorGris);
$pdf->SetXY(4, $yL6 + 3);
$pdf->Cell($anchoUtil, 4, "Gracias por su compra!", 0, 1, "C");
$pdf->SetX(4);
$pdf->Cell($anchoUtil, 3, date("d/m/Y H:i"), 0, 0, "C");

/*=============================================
SALIDA — inline en el navegador
=============================================*/
$pdf->Output("ticket-" . $codigoFactura . ".pdf", "I");
