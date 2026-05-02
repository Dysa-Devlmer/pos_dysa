import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ScrollToTop } from "@/components/scroll-to-top";
import { contarAlertasStock } from "./alertas/actions";

/**
 * Cache del perfil del usuario por 5 min, taggeado por `usuario:{id}`.
 * El layout corre en CADA navegación del dashboard; sin cache, eran ~30-80ms
 * de Postgres extra por cada click. Las acciones de /perfil ya invalidan el
 * tag (ver `app/(dashboard)/perfil/actions.ts:revalidateTag(...)`), así que
 * los cambios de avatar/nombre se reflejan al instante.
 */
const getPerfilCacheado = (userId: number) =>
  unstable_cache(
    () =>
      prisma.usuario.findUnique({
        where: { id: userId },
        // mustChangePassword incluido en el cache porque se chequea en
        // el gate del layout. El tag `usuario:${id}` ya se invalida en
        // perfil/actions.ts y usuarios/actions.ts → cambio de password
        // se refleja en la siguiente nav.
        select: {
          avatar: true,
          nombre: true,
          email: true,
          mustChangePassword: true,
        },
      }),
    ["dashboard-perfil", String(userId)],
    { revalidate: 300, tags: [`usuario:${userId}`] },
  )();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [perfil, alertasCount] = await Promise.all([
    getPerfilCacheado(Number(session.user.id)),
    contarAlertasStock().catch(() => 0),
  ]);

  // Fase 3C.2 — gate de contraseña temporal.
  // Si ADMIN creó al usuario o le reseteó password, debe cambiarla antes
  // de poder usar el sistema. Redirige a /cambiar-password (ruta fuera
  // del grupo (dashboard) → no genera loop). Se revalida vía el tag
  // `usuario:${id}` cuando el cambio se completa.
  if (perfil?.mustChangePassword) {
    redirect("/cambiar-password");
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <ScrollToTop />
      <Sidebar
        rol={session.user.rol}
        alertasStockCount={alertasCount}
        userName={perfil?.nombre ?? session.user.name ?? "Usuario"}
        userEmail={perfil?.email ?? session.user.email ?? ""}
        userAvatar={perfil?.avatar ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={session.user}
          avatar={perfil?.avatar ?? null}
          alertasStockCount={alertasCount}
        />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
