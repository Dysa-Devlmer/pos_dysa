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
        select: { avatar: true, nombre: true, email: true },
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
