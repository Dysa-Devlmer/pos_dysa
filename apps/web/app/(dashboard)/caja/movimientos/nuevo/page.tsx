import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";

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
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Movimiento de caja"
        subtitle="Registra retiros, ingresos o ajustes vinculados al turno activo."
      />
      <MovimientoForm
        aperturaId={apertura.id}
        cajaNombre={apertura.caja.nombre}
      />
    </div>
  );
}
