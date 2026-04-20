import type { Metadata } from "next";
import { AlertTriangle, PackageX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <AlertTriangle className="size-6 text-amber-500" />
            Alertas de Stock
          </h1>
          <p className="text-sm text-muted-foreground">
            Productos cuyo inventario está por debajo del umbral configurado.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total con alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {productos.length}
            </p>
            <p className="text-xs text-muted-foreground">productos activos</p>
          </CardContent>
        </Card>

        <Card className={sinStockCount > 0 ? "border-zinc-400" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin stock
            </CardTitle>
            <PackageX className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{sinStockCount}</p>
            <p className="text-xs text-muted-foreground">stock en 0</p>
          </CardContent>
        </Card>

        <Card className={bajoStockCount > 0 ? "border-destructive/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock bajo
            </CardTitle>
            <AlertTriangle
              className={
                bajoStockCount > 0
                  ? "size-4 text-destructive"
                  : "size-4 text-muted-foreground"
              }
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{bajoStockCount}</p>
            <p className="text-xs text-muted-foreground">
              por encima de 0 y bajo umbral
            </p>
          </CardContent>
        </Card>
      </div>

      {productos.length === 0 ? (
        <AlertasEmptyState />
      ) : (
        <AlertasList data={productos} />
      )}
    </div>
  );
}
