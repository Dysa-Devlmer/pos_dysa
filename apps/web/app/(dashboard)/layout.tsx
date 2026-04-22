import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ScrollToTop } from "@/components/scroll-to-top";
import { contarAlertasStock } from "./alertas/actions";

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
    prisma.usuario.findUnique({
      where: { id: Number(session.user.id) },
      select: { avatar: true, nombre: true, email: true },
    }),
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
