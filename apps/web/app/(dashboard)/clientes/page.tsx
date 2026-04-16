import { prisma } from "@repo/db";
import { ClientesTable, type ClienteRow } from "./clientes-table";

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Base de clientes con RUT chileno, historial de compras y contacto.
        </p>
      </div>
      <ClientesTable data={rows} />
    </div>
  );
}
