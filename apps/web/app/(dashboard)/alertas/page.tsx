import type { Metadata } from "next";

import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";

import { AlertasEmptyState } from "./empty-state";
import { AlertasList } from "./alertas-list";
import { obtenerProductosConAlertaStock } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Alertas de stock" };

export default async function AlertasPage() {
  const productos = await obtenerProductosConAlertaStock();
  const sinStockCount = productos.filter((p) => p.sinStock).length;
  const bajoStockCount = productos.length - sinStockCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de Stock"
        subtitle="Productos cuyo inventario está por debajo del umbral configurado."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total con alerta"
          value={productos.length}
          sublabel="productos activos"
        />
        <KpiCard
          label="Sin stock"
          value={sinStockCount}
          sublabel="stock en 0"
        />
        <KpiCard
          label="Stock bajo"
          value={bajoStockCount}
          sublabel="por encima de 0 y bajo umbral"
          tone={bajoStockCount > 0 ? "destructive" : "default"}
        />
      </div>

      {productos.length === 0 ? (
        <AlertasEmptyState />
      ) : (
        <AlertasList data={productos} />
      )}
    </div>
  );
}
