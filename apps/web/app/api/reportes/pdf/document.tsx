/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCLPPlain } from "@/lib/reportes-fecha";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface ReporteVentaRow {
  numeroBoleta: string;
  fechaFmt: string;         // "16/04/2026 14:30"
  clienteNombre: string;    // "—" si no tiene
  metodoPago: string;
  vendedor: string;
  subtotal: number;
  /** CLP total descontado (porcentual + fijo). 0 si no hay descuento. */
  descuentoTotal: number;
  impuesto: number;
  total: number;
}

export interface ReporteResumen {
  totalVentas: number;
  totalCLP: number;
  ticketPromedio: number;
  porMetodo: Array<{ metodo: string; cantidad: number; total: number }>;
}

export interface ReporteDocumentProps {
  desde: string;   // "DD/MM/YYYY"
  hasta: string;   // "DD/MM/YYYY"
  generadoEn: string; // "DD/MM/YYYY HH:MM"
  rows: ReporteVentaRow[];
  resumen: ReporteResumen;
}

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────

const COLORS = {
  border: "#D4D4D8",
  borderStrong: "#71717A",
  zebra: "#F4F4F5",
  heading: "#18181B",
  muted: "#52525B",
  accent: "#18181B",
  cardBg: "#FAFAFA",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.heading,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderStrong,
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  brandSub: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  meta: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
  },
  // Resumen boxes
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    backgroundColor: COLORS.cardBg,
  },
  kpiLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  // Método pago inline
  metodosWrap: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
  },
  metodosTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  metodosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metodoItem: {
    flexBasis: "25%",
    paddingVertical: 2,
    paddingRight: 8,
  },
  // Tabla ventas
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: COLORS.borderStrong,
  },
  th: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  tr: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  trZebra: { backgroundColor: COLORS.zebra },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8.5,
  },
  // Column widths (must sum to 100)
  cBoleta: { width: "17%" },
  cFecha: { width: "13%" },
  cCliente: { width: "19%" },
  cVendedor: { width: "13%" },
  cMetodo: { width: "9%" },
  cDescuento: { width: "11%", textAlign: "right" as const },
  cTotal: { width: "18%", textAlign: "right" as const },
  numberCell: { textAlign: "right" as const },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  pageNum: { color: COLORS.muted },
  emptyBox: {
    padding: 24,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed" as any,
    borderRadius: 4,
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Document
// ──────────────────────────────────────────────────────────────────────────

export function ReporteDocument({
  desde,
  hasta,
  generadoEn,
  rows,
  resumen,
}: ReporteDocumentProps) {
  return (
    <Document title={`Reporte Ventas ${desde} - ${hasta}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>DyPos CL</Text>
            <Text style={styles.brandSub}>Reporte de Ventas</Text>
          </View>
          <View style={styles.meta}>
            <Text>
              Período: {desde} — {hasta}
            </Text>
            <Text>Generado: {generadoEn}</Text>
          </View>
        </View>

        {/* Resumen KPIs */}
        <View style={styles.summaryRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Ventas</Text>
            <Text style={styles.kpiValue}>{resumen.totalVentas}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total facturado</Text>
            <Text style={styles.kpiValue}>{formatCLPPlain(resumen.totalCLP)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Ticket promedio</Text>
            <Text style={styles.kpiValue}>
              {formatCLPPlain(resumen.ticketPromedio)}
            </Text>
          </View>
        </View>

        {/* Métodos */}
        {resumen.porMetodo.length > 0 ? (
          <View style={styles.metodosWrap}>
            <Text style={styles.metodosTitle}>Desglose por método de pago</Text>
            <View style={styles.metodosGrid}>
              {resumen.porMetodo.map((m) => (
                <View key={m.metodo} style={styles.metodoItem}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>
                    {m.metodo}
                  </Text>
                  <Text style={{ color: COLORS.muted, fontSize: 8 }}>
                    {m.cantidad} {m.cantidad === 1 ? "venta" : "ventas"}
                  </Text>
                  <Text style={{ fontSize: 9 }}>{formatCLPPlain(m.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Tabla */}
        <Text style={styles.sectionTitle}>
          Detalle de ventas ({rows.length})
        </Text>

        {rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text>No hay ventas registradas en el período seleccionado.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.thead} fixed>
              <Text style={[styles.th, styles.cBoleta]}>N° Boleta</Text>
              <Text style={[styles.th, styles.cFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.cCliente]}>Cliente</Text>
              <Text style={[styles.th, styles.cVendedor]}>Vendedor</Text>
              <Text style={[styles.th, styles.cMetodo]}>Pago</Text>
              <Text style={[styles.th, styles.cDescuento]}>Descuento</Text>
              <Text style={[styles.th, styles.cTotal]}>Total</Text>
            </View>
            {rows.map((r, i) => (
              <View
                key={r.numeroBoleta + i}
                style={[styles.tr, i % 2 === 1 ? styles.trZebra : {}]}
                wrap={false}
              >
                <Text style={[styles.td, styles.cBoleta]}>{r.numeroBoleta}</Text>
                <Text style={[styles.td, styles.cFecha]}>{r.fechaFmt}</Text>
                <Text style={[styles.td, styles.cCliente]}>
                  {r.clienteNombre}
                </Text>
                <Text style={[styles.td, styles.cVendedor]}>{r.vendedor}</Text>
                <Text style={[styles.td, styles.cMetodo]}>{r.metodoPago}</Text>
                <Text style={[styles.td, styles.cDescuento]}>
                  {r.descuentoTotal > 0
                    ? `− ${formatCLPPlain(r.descuentoTotal)}`
                    : "—"}
                </Text>
                <Text style={[styles.td, styles.cTotal]}>
                  {formatCLPPlain(r.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>DyPos CL · Sistema de punto de venta</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
