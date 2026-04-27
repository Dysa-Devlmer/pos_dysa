import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obtenerAperturaActiva } from "../../actions";
import { MovimientoForm } from "./movimiento-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Movimiento de caja" };

export default async function NuevoMovimientoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const usuarioId = Number(session.user.id);

  const apertura = await obtenerAperturaActiva(usuarioId);
  if (!apertura) redirect("/caja/abrir");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Movimiento de caja
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra retiros, ingresos o ajustes vinculados al turno activo.
        </p>
      </div>
      <MovimientoForm
        aperturaId={apertura.id}
        cajaNombre={apertura.caja.nombre}
      />
    </div>
  );
}
