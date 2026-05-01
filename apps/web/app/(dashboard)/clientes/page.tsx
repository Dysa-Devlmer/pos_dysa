import type { Metadata } from "next";
import { prisma } from "@repo/db";

import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { formatCLP } from "@/lib/utils";

import { ClientesTable, type ClienteRow } from "./clientes-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      ventas: {
        select: { total: true, fecha: true },
        orderBy: { fecha: "desc" },
      },
    },
  });

  const rows: ClienteRow[] = clientes.map((c) => {
    const comprasTotal = c.ventas.reduce((acc, v) => acc + v.total, 0);
    const ultima = c.ventas[0]?.fecha;
    return {
      id: c.id,
      rut: c.rut,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      comprasTotal,
      ultimaCompra: ultima ? ultima.toISOString() : null,
    };
  });

  // KPIs derivados de los datos ya en memoria — sin queries extra.
  const totalClientes = rows.length;
  const hace30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const conComprasReciente = rows.filter(
    (r) => r.ultimaCompra && new Date(r.ultimaCompra).getTime() >= hace30d,
  ).length;
  const facturacionAcumulada = rows.reduce((a, r) => a + r.comprasTotal, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Base de clientes con RUT chileno, historial de compras y contacto."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Total clientes" value={totalClientes} />
        <KpiCard
          label="Compraron en 30 días"
          value={conComprasReciente}
          sublabel={
            totalClientes > 0
              ? `${Math.round((conComprasReciente / totalClientes) * 100)}% del total`
              : undefined
          }
        />
        <KpiCard
          label="Facturación acumulada"
          value={formatCLP(facturacionAcumulada)}
          sublabel="todas las ventas históricas"
        />
      </div>

      <ClientesTable data={rows} />
    </div>
  );
}
