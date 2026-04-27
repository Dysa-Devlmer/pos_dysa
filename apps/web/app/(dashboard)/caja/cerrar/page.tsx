import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obtenerAperturaActiva, obtenerResumenCierre } from "../actions";
import { CerrarCajaForm } from "./cerrar-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cerrar Caja" };

export default async function CerrarCajaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const usuarioId = Number(session.user.id);

  const apertura = await obtenerAperturaActiva(usuarioId);
  if (!apertura) redirect("/caja/abrir");

  const resumen = await obtenerResumenCierre(apertura.id);
  if (!resumen) redirect("/caja/abrir");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cerrar caja</h1>
        <p className="text-sm text-muted-foreground">
          Declara el efectivo final contado y cierra el turno. La diferencia
          (declarado − sistema) queda registrada para auditoría.
        </p>
      </div>
      <CerrarCajaForm
        aperturaId={apertura.id}
        cajaNombre={apertura.caja.nombre}
        montoInicial={apertura.montoInicial}
        ventasCount={resumen.ventasCount}
        ventasTotal={resumen.ventasTotal}
        montoFinalSistema={resumen.montoFinalSistema}
        pagosPorMetodo={resumen.pagosPorMetodo}
      />
    </div>
  );
}
