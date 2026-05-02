import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

import { CambiarPasswordForm } from "./form";

/**
 * Fase 3C.2 — Pantalla obligatoria de cambio de contraseña.
 *
 * Render-time guards:
 * 1. Sin sesión → /login (defense-in-depth, el middleware ya lo hace).
 * 2. Sesión OK pero `mustChangePassword=false` → /perfil (no debería estar
 *    en esta ruta; se llegó manualmente). Cero fricción para usuarios que
 *    ya cumplieron el flujo.
 *
 * Layout standalone (sin sidebar). El layout root sí aplica.
 */
export default async function CambiarPasswordPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const id = Number(session.user.id);
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { mustChangePassword: true, nombre: true },
  });

  if (!usuario) {
    redirect("/login");
  }
  if (!usuario.mustChangePassword) {
    redirect("/perfil");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Cambia tu contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Hola {usuario.nombre}, tu contraseña fue asignada por el
            administrador. Por seguridad, debés elegir una nueva antes de
            continuar.
          </p>
        </header>

        <CambiarPasswordForm />

        <p className="text-center text-xs text-muted-foreground">
          Mínimo 6 caracteres. Distinta a la temporal.
        </p>
      </div>
    </main>
  );
}
