import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
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
      select: { avatar: true },
    }),
    contarAlertasStock().catch(() => 0),
  ]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar rol={session.user.rol} alertasStockCount={alertasCount} />
      <div className="flex flex-1 flex-col">
        <Header user={session.user} avatar={perfil?.avatar ?? null} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
