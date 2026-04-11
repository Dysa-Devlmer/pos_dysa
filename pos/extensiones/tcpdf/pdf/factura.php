<?php

/*=============================================
FACTURA PDF — TCPDF
Genera y muestra la factura de venta en el navegador
=============================================*/

require_once "../../../controladores/ventas.controlador.php";
require_once "../../../modelos/ventas.modelo.php";
require_once "../../../controladores/clientes.controlador.php";
require_once "../../../modelos/clientes.modelo.php";
require_once "../../../controladores/usuarios.controlador.php";
require_once "../../../modelos/usuarios.modelo.php";
require_once "../../../controladores/productos.controlador.php";
require_once "../../../modelos/productos.modelo.php";
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
$metodo    = htmlspecialchars($venta["metodo_pago"] ?? "—");

/*=============================================
TRAER CLIENTE Y VENDEDOR
=============================================*/
$cliente  = ControladorClientes::ctrMostrarClientes("id", $venta["id_cliente"]);
$vendedor = ControladorUsuarios::ctrMostrarUsuarios("id", $venta["id_vendedor"]);

$nombreCliente  = htmlspecialchars($cliente["nombre"]  ?? "—");
$nombreVendedor = htmlspecialchars($vendedor["nombre"] ?? "—");

/*=============================================
CONFIGURAR TCPDF
=============================================*/
$pdf = new TCPDF("P", PDF_UNIT, "A4", true, "UTF-8", false);

// Metadatos
$pdf->SetCreator("POS System");
$pdf->SetAuthor("Devlmer POS");
$pdf->SetTitle("Factura #" . $codigoFactura);
$pdf->SetSubject("Factura de Venta");
$pdf->SetKeywords("factura, venta, pos");

// Sin cabecera ni pie de página por defecto
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

// Márgenes
$pdf->SetMargins(15, 15, 15);
$pdf->SetAutoPageBreak(true, 15);
$pdf->SetFont("helvetica", "", 9);

$pdf->startPageGroup();
$pdf->AddPage();

// Paleta de colores
$colorPrimario  = [22,  163, 74];   // verde
$colorGris      = [71,  85,  105];  // gris slate
$colorGrisClaro = [241, 245, 249];  // fondo filas pares
$colorBorde     = [203, 213, 225];  // borde tabla
$colorBlanco    = [255, 255, 255];
$colorTexto     = [30,  41,  59];   // slate-800

/*=============================================
CABECERA — EMPRESA + NRO FACTURA
=============================================*/

// Fondo verde del header
$pdf->SetFillColor(...$colorPrimario);
$pdf->Rect(15, 15, 180, 28, "F");

// Nombre empresa
$pdf->SetFont("helvetica", "B", 18);
$pdf->SetTextColor(...$colorBlanco);
$pdf->SetXY(20, 19);
$pdf->Cell(100, 8, "DEVLMER POS", 0, 0, "L", false);

// Subtítulo empresa
$pdf->SetFont("helvetica", "", 8);
$pdf->SetXY(20, 27);
$pdf->Cell(100, 5, "Sistema de Punto de Venta  |  ventas@devlmerpos.com  |  Tel. 300 786 52 49", 0, 0, "L", false);
$pdf->SetXY(20, 33);
$pdf->Cell(100, 4, "NIT: 71.759.963-9  |  Calle 44B 92-11, Ciudad", 0, 0, "L", false);

// Bloque FACTURA N.°
$pdf->SetFillColor(15, 118, 54);  // verde oscuro
$pdf->Rect(130, 15, 65, 28, "F");
$pdf->SetFont("helvetica", "B", 8);
$pdf->SetTextColor(...$colorBlanco);
$pdf->SetXY(130, 18);
$pdf->Cell(65, 5, "FACTURA N.\xc2\xb0", 0, 0, "C", false);
$pdf->SetFont("helvetica", "B", 16);
$pdf->SetXY(130, 24);
$pdf->Cell(65, 10, $codigoFactura, 0, 0, "C", false);

/*=============================================
BLOQUE DE DATOS DEL CLIENTE / VENTA
=============================================*/
$pdf->SetTextColor(...$colorTexto);
$pdf->SetFont("helvetica", "", 9);
$pdf->SetY(50);

// Fondo gris claro para el bloque de info
$pdf->SetFillColor(...$colorGrisClaro);
$pdf->Rect(15, 50, 180, 24, "F");

// Etiquetas en negrita
$pdf->SetFont("helvetica", "B", 8);
$pdf->SetTextColor(...$colorGris);

$pdf->SetXY(18, 53);
$pdf->Cell(30, 5, "CLIENTE:", 0, 0, "L");
$pdf->SetXY(18, 60);
$pdf->Cell(30, 5, "VENDEDOR:", 0, 0, "L");

$pdf->SetXY(110, 53);
$pdf->Cell(25, 5, "FECHA:", 0, 0, "L");
$pdf->SetXY(110, 60);
$pdf->Cell(25, 5, "PAGO:", 0, 0, "L");

// Valores
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(...$colorTexto);

$pdf->SetXY(48, 53);
$pdf->Cell(60, 5, $nombreCliente, 0, 0, "L");
$pdf->SetXY(48, 60);
$pdf->Cell(60, 5, $nombreVendedor, 0, 0, "L");

$pdf->SetXY(135, 53);
$pdf->Cell(55, 5, $fecha, 0, 0, "L");
$pdf->SetXY(135, 60);
$pdf->Cell(55, 5, $metodo, 0, 0, "L");

/*=============================================
TABLA DE PRODUCTOS — ENCABEZADO
=============================================*/
$yTabla = 80;

$pdf->SetFillColor(...$colorPrimario);
$pdf->SetTextColor(...$colorBlanco);
$pdf->SetFont("helvetica", "B", 9);
$pdf->SetXY(15, $yTabla);

$pdf->Cell(80, 7, "PRODUCTO", 0, 0, "C", true);
$pdf->Cell(25, 7, "CANTIDAD", 0, 0, "C", true);
$pdf->Cell(37, 7, "PRECIO UNIT.", 0, 0, "C", true);
$pdf->Cell(38, 7, "TOTAL", 0, 1, "C", true);

/*=============================================
TABLA DE PRODUCTOS — FILAS
=============================================*/
$pdf->SetFont("helvetica", "", 9);
$esPar = false;

foreach ($productos as $item) {

    // Buscar precio unitario del producto
    $prod = ControladorProductos::ctrMostrarProductos("descripcion", $item["descripcion"], null);
    $valorUnitario = $prod ? (float) $prod["precio_venta"] : (float) $item["precio"];
    $totalItem     = (float) $item["total"];

    // Alternar color de fila
    if ($esPar) {
        $pdf->SetFillColor(...$colorGrisClaro);
    } else {
        $pdf->SetFillColor(...$colorBlanco);
    }
    $esPar = !$esPar;

    $pdf->SetTextColor(...$colorTexto);

    $pdf->Cell(80, 6, htmlspecialchars($item["descripcion"]), 0, 0, "L", true);
    $pdf->Cell(25, 6, $item["cantidad"], 0, 0, "C", true);
    $pdf->Cell(37, 6, "$ " . number_format($valorUnitario, 2), 0, 0, "R", true);
    $pdf->Cell(38, 6, "$ " . number_format($totalItem, 2), 0, 1, "R", true);
}

// Línea divisoria
$yActual = $pdf->GetY();
$pdf->SetDrawColor(...$colorBorde);
$pdf->Line(15, $yActual + 2, 195, $yActual + 2);

/*=============================================
TOTALES
=============================================*/
$yTotales = $yActual + 6;
$pdf->SetFont("helvetica", "", 9);
$pdf->SetTextColor(...$colorGris);

// Neto
$pdf->SetXY(120, $yTotales);
$pdf->SetFillColor(...$colorGrisClaro);
$pdf->Cell(45, 6, "Subtotal (neto):", 0, 0, "R", false);
$pdf->SetTextColor(...$colorTexto);
$pdf->Cell(30, 6, "$ " . number_format($neto, 2), 0, 1, "R", false);

// Impuesto
$pdf->SetXY(120, $pdf->GetY());
$pdf->SetTextColor(...$colorGris);
$pdf->Cell(45, 6, "Impuesto:", 0, 0, "R", false);
$pdf->SetTextColor(...$colorTexto);
$pdf->Cell(30, 6, "$ " . number_format($impuesto, 2), 0, 1, "R", false);

// Separador
$yLinea = $pdf->GetY() + 1;
$pdf->SetDrawColor(...$colorPrimario);
$pdf->SetLineWidth(0.5);
$pdf->Line(120, $yLinea, 195, $yLinea);
$pdf->SetLineWidth(0.2);

// Total
$pdf->SetXY(120, $yLinea + 2);
$pdf->SetFillColor(...$colorPrimario);
$pdf->SetTextColor(...$colorBlanco);
$pdf->SetFont("helvetica", "B", 11);
$pdf->Cell(75, 8, "TOTAL:   $ " . number_format($total, 2), 0, 1, "R", true);

/*=============================================
PIE DE PÁGINA
=============================================*/
$yPie = $pdf->GetY() + 12;
$pdf->SetTextColor(...$colorGris);
$pdf->SetFont("helvetica", "I", 8);
$pdf->SetXY(15, $yPie);
$pdf->Cell(180, 5, "Gracias por su compra. Este documento es v\xc3\xa1lido como soporte de pago.", 0, 1, "C");
$pdf->SetFont("helvetica", "", 7);
$pdf->SetXY(15, $pdf->GetY());
$pdf->Cell(180, 4, "Generado por Devlmer POS  |  " . date("d/m/Y H:i"), 0, 0, "C");

/*=============================================
SALIDA — inline en el navegador
=============================================*/
$pdf->Output("factura-" . $codigoFactura . ".pdf", "I");
