import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCLP } from "@/lib/utils";

import { RestaurarBoton } from "./restaurar-boton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ventas eliminadas" };

const CHILE_TZ = "America/Santiago";

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function VentasEliminadasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "ADMIN") {
    // CAJERO/VENDEDOR no debe acceder. Redirigimos a /ventas con flag.
    redirect("/ventas?error=admin_required");
  }

  const ventas = await prisma.venta.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      usuario: { select: { nombre: true } },
      deletedByUsuario: { select: { id: true, nombre: true, email: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas eliminadas</h1>
        <p className="text-sm text-muted-foreground">
          Bitácora de ventas con soft-delete. Solo administradores pueden
          restaurar. Al restaurar se re-aplica el stock — si no hay stock
          suficiente, la operación falla con 409.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ventas.length} venta(s) eliminada(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay ventas eliminadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Boleta</TableHead>
                  <TableHead>Fecha venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Eliminada</TableHead>
                  <TableHead>Por</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">
                      {v.numeroBoleta}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtFecha(v.fecha)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.cliente?.nombre ?? (
                        <span className="italic text-muted-foreground">
                          Sin cliente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtFecha(v.deletedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.deletedByUsuario?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {v.deletionReason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCLP(v.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RestaurarBoton id={v.id} numeroBoleta={v.numeroBoleta} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
