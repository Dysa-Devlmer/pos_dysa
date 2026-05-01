import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";

import { obtenerAperturaActiva } from "../actions";
import { AbrirCajaForm } from "./abrir-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Abrir Caja" };

export default async function AbrirCajaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const usuarioId = Number(session.user.id);

  const apertura = await obtenerAperturaActiva(usuarioId);
  if (apertura) redirect("/caja");

  const cajas = await prisma.caja.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, ubicacion: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Abrir caja"
        subtitle="Selecciona la caja y declara el monto inicial en efectivo del turno."
      />
      <AbrirCajaForm cajas={cajas} />
    </div>
  );
}
